import { z } from 'zod';
import type { DailyNewsOutput } from '../schemas/dailyNews';
import { dailyNewsOutputSchema } from '../schemas/dailyNews';
import {
	appendResponseToHistory,
	collectHttpUrlsFromUnknown,
	extractHttpUrlsFromText,
	normalizeDailyNewsOutput,
	normalizeWordSelectionPayload
} from './openaiHelpers';
import {
	WORD_SELECTION_SYSTEM_PROMPT,
	buildDraftGenerationUserPrompt,
	buildJsonConversionUserPrompt,
	buildResearchUserPrompt,
	buildWordSelectionUserPrompt
} from './openaiPrompts';

import { createOpenAiCompatibleClient, type OpenAiCompatibleEnv } from './client';

// Re-export for backward compatibility if needed, or simply use the import.
// Using factory from client.ts inside generation function.


// ============================================
// 候选词类型
// ============================================

export type CandidateWord = {
	word: string;
	type: 'new' | 'review';
	due: boolean;
	state: 'new' | 'learning' | 'review' | 'relearning';
};

// ============================================
// 选词 schema
// ============================================

const wordSelectionSchema = z.object({
	selected_words: z.array(z.string()).min(1).max(12),
	selection_reasoning: z.string().optional()
});

// ============================================
// 多轮生成主流程
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
	// 多阶段流程：阶段1 选词(JSON)，阶段2 搜索(web_search)，阶段3 生成(JSON)。
	const client = createOpenAiCompatibleClient(args.env);

	// 多轮对话历史
	let history: any[] = [];

	// ============================================
	// 阶段 1：选词
	// ============================================

	const candidateWordsJson = JSON.stringify(args.candidateWords, null, 2);

	history.push({
		role: 'system',
		content: WORD_SELECTION_SYSTEM_PROMPT
	});
	history.push({
		role: 'user',
		content: buildWordSelectionUserPrompt({
			candidateWordsJson,
			topicPreference: args.topicPreference,
			currentDate: args.currentDate
		})
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

	// 调试：输出完整响应结构
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
	rawParsed = normalizeWordSelectionPayload(rawParsed);

	const wordSelectionParsed = wordSelectionSchema.safeParse(rawParsed);
	if (!wordSelectionParsed.success) {
		throw new Error(`Invalid word selection JSON: ${wordSelectionParsed.error.message}\nRaw: ${wordSelectionText.slice(0, 500)}`);
	}

	const selectedWords = wordSelectionParsed.data.selected_words;
	console.log('[Word Selection] Extracted words:', selectedWords);

	history = appendResponseToHistory(history, wordSelectionResp);

	// ============================================
	// 阶段 2：新闻检索（web_search）
	// ============================================

	history.push({
		role: 'user',
		content: buildResearchUserPrompt({
			selectedWords,
			topicPreference: args.topicPreference,
			currentDate: args.currentDate
		})
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
	// 阶段 3A：文章生成草稿（非 JSON）
	// ============================================

	history.push({
		role: 'user',
		content: buildDraftGenerationUserPrompt({
			selectedWords,
			sourceUrls,
			systemPrompt: args.systemPrompt,
			currentDate: args.currentDate,
			topicPreference: args.topicPreference
		})
	});

	const draftResp = await client.responses.create({
		model: args.model,
		stream: false,
		temperature: args.temperature,
		max_output_tokens: args.maxOutputTokens,
		reasoning: { effort: 'xhigh' },
		input: history
	});

	const draftText = draftResp.output_text?.trim();
	if (!draftText) throw new Error('LLM returned empty draft content');

	history = appendResponseToHistory(history, draftResp);

	// ============================================
	// 阶段 3B：草稿转 JSON（JSON mode）
	// ============================================

	history.push({
		role: 'user',
		content: buildJsonConversionUserPrompt({
			draftText,
			sourceUrls,
			selectedWords
		})
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
