import OpenAI from 'openai';
import { z } from 'zod';
import type { DailyNewsOutput } from '../schemas/dailyNews';
import { dailyNewsOutputSchema } from '../schemas/dailyNews';

export type OpenAiCompatibleEnv = {
	LLM_API_KEY: string;
	LLM_BASE_URL: string;
};

export function createOpenAiCompatibleClient(
	env: OpenAiCompatibleEnv,
	options?: { dangerouslyAllowBrowser?: boolean }
) {
	if (!env.LLM_API_KEY) throw new Error('Missing LLM_API_KEY');
	if (!env.LLM_BASE_URL) throw new Error('Missing LLM_BASE_URL');
	return new OpenAI({
		apiKey: env.LLM_API_KEY,
		baseURL: env.LLM_BASE_URL,
		...(options?.dangerouslyAllowBrowser ? { dangerouslyAllowBrowser: true } : null)
	});
}

// ============================================
// Helper Functions
// ============================================

function ensureContentParagraphs(content: string, level: number) {
	const text = content.replace(/\r\n/g, '\n').trim();
	if (!text) return text;

	if (/\n\s*\n/.test(text)) {
		const paragraphs = text
			.split(/\n\s*\n+/)
			.map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim())
			.filter(Boolean);
		return paragraphs.join('\n\n');
	}

	const flattened = text.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
	if (!flattened) return flattened;

	const withLines = flattened.replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1\n');
	const sentences = withLines
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
	if (sentences.length <= 1) return flattened;

	const desiredParagraphs = level === 1 ? 2 : level === 2 ? 2 : 3;
	const perParagraph = Math.max(2, Math.ceil(sentences.length / desiredParagraphs));

	const paragraphs: string[] = [];
	for (let i = 0; i < sentences.length; i += perParagraph) {
		paragraphs.push(sentences.slice(i, i + perParagraph).join(' '));
	}
	return paragraphs.join('\n\n');
}

function normalizeDailyNewsOutput(output: DailyNewsOutput): DailyNewsOutput {
	return {
		...output,
		articles: output.articles.map((a) => ({
			...a,
			content: ensureContentParagraphs(a.content, a.level)
		}))
	};
}

function normalizeUrl(raw: string) {
	return raw
		.trim()
		.replace(/^<+/, '')
		.replace(/>+$/, '')
		.replace(/[)\]}>.,;:，。；：]+$/, '');
}

function extractHttpUrlsFromText(text: string): string[] {
	const matches = text.match(/https?:\/\/[^\s<>()\[\]]+/g) ?? [];
	return matches.map(normalizeUrl).filter(Boolean);
}

function collectHttpUrlsFromUnknown(value: unknown): string[] {
	const urls: string[] = [];
	const seen = new Set<unknown>();

	const walk = (v: unknown) => {
		if (v == null) return;
		if (typeof v === 'string') {
			urls.push(...extractHttpUrlsFromText(v));
			return;
		}
		if (typeof v !== 'object') return;
		if (seen.has(v)) return;
		seen.add(v);

		if (Array.isArray(v)) {
			for (const item of v) walk(item);
			return;
		}
		for (const item of Object.values(v as Record<string, unknown>)) walk(item);
	};

	walk(value);
	return urls;
}

// Append response output to history for multi-turn conversation
function appendResponseToHistory(history: any[], response: any): any[] {
	return [
		...history,
		...response.output.map(({ id, ...rest }: any) => rest)
	];
}

// ============================================
// Candidate Word Type
// ============================================

export type CandidateWord = {
	word: string;
	type: 'new' | 'review';
	due: boolean;
	state: 'new' | 'learning' | 'review' | 'relearning';
};

// ============================================
// Word Selection Schema
// ============================================

const wordSelectionSchema = z.object({
	selected_words: z.array(z.string()).min(1).max(12),
	selection_reasoning: z.string().optional()
});

// ============================================
// Main Multi-Turn Generation Function
// ============================================

export async function generateDailyNewsWithWordSelection(args: {
	env: OpenAiCompatibleEnv;
	model: string;
	systemPrompt: string;
	currentDate: string;
	topicPreference: string;
	candidateWords: CandidateWord[];
	temperature: number;
	maxOutputTokens: number;
}): Promise<{ output: DailyNewsOutput; selectedWords: string[]; usage: unknown }> {
	const client = createOpenAiCompatibleClient(args.env);

	// Multi-turn conversation history
	let history: any[] = [];

	// ============================================
	// Phase 1: Word Selection
	// ============================================

	const wordSelectionSystemPrompt = `你是一位 ESL 内容开发者。

【最终目标】
你将帮我完成一个三阶段任务：
1. 从候选词中选词（本阶段）
2. 搜索当日英文新闻
3. 写出三档难度的英语新闻文章（Easy/Medium/Hard）

【本阶段任务】
从下面的候选词中，选出最多 12 个「最适合写进当日新闻文章」的词。

【选词策略】
- 优先选「新词 + 到期」（type=new, due=true）
- 其次选「复习词 + 到期」（type=review, due=true）
- 最后选其他到期词
- 考虑这些词能否自然地融入一篇真实新闻故事
- 避免过于抽象或难以在新闻中使用的词

【输出格式 - 严格遵守，否则系统报错】
返回 JSON，字段名必须完全匹配：
{
  "selected_words": ["word1", "word2", "word3"],
  "selection_reasoning": "简要说明选择理由"
}

【关键约束】
1. 字段名必须是 "selected_words"（不是 "selected"，不是 "words"）
2. selected_words 必须是纯字符串数组，如 ["debate", "sector", "annual"]
3. 不要在数组中放对象，不要加 word/type/why 等嵌套结构
4. 不要添加 date 或其他额外字段
5. 如果你输出任何对象或额外字段，系统会直接判定失败（不要冒险）`;

	const candidateWordsJson = JSON.stringify(args.candidateWords, null, 2);

	history.push({
		role: 'system',
		content: wordSelectionSystemPrompt
	});
	history.push({
		role: 'user',
		content: `【候选词列表】
${candidateWordsJson}

【主题偏好】${args.topicPreference}
【日期】${args.currentDate}

请从候选词中选择最多 12 个适合写入当日英文新闻的词。返回 JSON 格式。`
	});

	const wordSelectionResp = await client.responses.create({
		model: args.model,
		stream: false,
		reasoning: {
			effort: "xhigh",
			summary: "detailed"
		},
		text: { format: { type: 'json_object' } },
		input: history
	});

	// Debug: Log complete response structure
	console.log('[Word Selection] API Response keys:', Object.keys(wordSelectionResp));
	console.log('[Word Selection] output_text:', wordSelectionResp.output_text);

	const wordSelectionText = wordSelectionResp.output_text?.trim();
	if (!wordSelectionText) throw new Error('LLM returned empty word selection');

	let rawParsed: unknown;
	try {
		rawParsed = JSON.parse(wordSelectionText);
	} catch (e) {
		throw new Error(`Failed to parse word selection JSON: ${e}\nRaw: ${wordSelectionText.slice(0, 500)}`);
	}

	const wordSelectionParsed = wordSelectionSchema.safeParse(rawParsed);
	if (!wordSelectionParsed.success) {
		throw new Error(`Invalid word selection JSON: ${wordSelectionParsed.error.message}\nRaw: ${wordSelectionText.slice(0, 500)}`);
	}

	const selectedWords = wordSelectionParsed.data.selected_words;
	console.log('[Word Selection] Extracted words:', selectedWords);

	history = appendResponseToHistory(history, wordSelectionResp);

	// ============================================
	// Phase 2: News Research (with web_search)
	// ============================================

	history.push({
		role: 'user',
		content: `【任务】
基于刚才选中的 ${selectedWords.length} 个词，搜索 ${args.currentDate} 的真实英文新闻。

【要求】
- 只搜索英文新闻源（如 BBC, CNN, Reuters, The Guardian, AP News 等）
- 找到一个与选中词汇相关的新闻事件
- 主题偏好：${args.topicPreference}
- 返回 3-6 条关键事实（英文）+ 2-5 个英文来源 URL

【禁止】
- 不要使用中文新闻源
- 不要翻译中文新闻

【选中的词汇】
${selectedWords.join(', ')}

请搜索新闻并返回研究笔记。`
	});

	const researchResp = await client.responses.create({
		model: args.model,
		stream: false,
		reasoning: {
			effort: "xhigh",
			summary: "detailed"
		},
		tools: [
			{
				type: 'web_search',
				user_location: { type: 'approximate', timezone: 'Asia/Shanghai' }
			}
		],
		tool_choice: 'auto',
		input: history,
		include: ['web_search_call.results', 'web_search_call.action.sources']
	});

	const researchText = researchResp.output_text?.trim() ?? '';
	if (!researchText) throw new Error('LLM returned empty research content');

	const sourceUrls = Array.from(
		new Set([
			...extractHttpUrlsFromText(researchText),
			...collectHttpUrlsFromUnknown(researchResp)
		])
	).slice(0, 8);

	if (sourceUrls.length === 0) throw new Error('LLM research produced no source URLs');

	history = appendResponseToHistory(history, researchResp);

	// ============================================
	// Phase 3: Article Generation (JSON mode)
	// ============================================

	const schemaHint = [
		'OUTPUT_SCHEMA (top-level JSON keys must match EXACTLY):',
		'{',
		'  "title": string,',
		'  "topic": string,',
		'  "sources": string[],  // 2-5 source URLs',
		'  "articles": [',
		'    {"level": 1, "level_name": string, "content": string, "difficulty_desc": string},',
		'    {"level": 2, "level_name": string, "content": string, "difficulty_desc": string},',
		'    {"level": 3, "level_name": string, "content": string, "difficulty_desc": string}',
		'  ],',
		'  "word_usage_check": {',
		'    "target_words_count": number,',
		'    "used_count": number,',
		'    "missing_words": string[]',
		'  },',
		'  "word_definitions": [',
		'    {',
		'      "word": string,',
		'      "phonetic": string,  // IPA, e.g. "/trænˈzɪʃən/"',
		'      "definitions": [',
		'        {"pos": string, "definition": string}  // pos: "n.", "v.", "adj." etc. definition: Chinese',
		'      ]',
		'    }',
		'  ]',
		'}'
	].join('\n');

	history.push({
		role: 'user',
		content: `【任务】
基于刚才的研究笔记和选中的词汇，生成三档难度的英语新闻文章。

【选中的词汇】
${selectedWords.join(', ')}

【已收集的来源 URL】
${JSON.stringify(sourceUrls)}

【文章规范】
${args.systemPrompt}

${schemaHint}

【格式要求】
- articles[*].content 必须是纯文本/Markdown，使用"正常段落排版"
- 段落之间用一个空行分隔
- 不要"一句一行"。每段建议 2-4 句
- 词汇要求：自然优先，不要为了塞词牺牲可读性；允许少量缺失，并在 missing_words 中如实列出

【词汇释义要求】
- 必须提供 word_definitions 数组
- 为每个选中的词汇提供：
  - phonetic: IPA 音标，如 "/trænˈzɪʃən/"
  - definitions: 中文释义数组，每项包含 pos（词性如 n./v./adj.）和 definition（中文解释）

请生成 JSON 格式的输出。`
	});

	const genResp = await client.responses.create({
		model: args.model,
		stream: false,
		temperature: args.temperature,
		max_output_tokens: args.maxOutputTokens,
		reasoning: { effort: 'xhigh' },
		text: { format: { type: 'json_object' } },
		input: history
	});

	const content = genResp.output_text;
	if (!content) throw new Error('LLM returned empty content');

	const parsed: unknown = JSON.parse(content);

	const first = dailyNewsOutputSchema.safeParse(parsed);
	if (!first.success) {
		throw new Error(`Invalid LLM JSON output: ${first.error.message}`);
	}
	const output: DailyNewsOutput = first.data;

	return {
		output: normalizeDailyNewsOutput(output),
		selectedWords,
		usage: {
			word_selection: wordSelectionResp.usage ?? null,
			research: researchResp.usage ?? null,
			generation: genResp.usage ?? null
		}
	};
}
