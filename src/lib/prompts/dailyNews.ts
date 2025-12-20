import dailyNewsMd from '../../../prompts/daily_news.md?raw';

function stripBlockquotes(input: string) {
	return input
		.split('\n')
		.map((line) => line.replace(/^\s*>\s?/, ''))
		.join('\n')
		.trim();
}

function extractSection(markdown: string, startHeading: string, endHeading: string) {
	const start = markdown.indexOf(startHeading);
	if (start === -1) throw new Error(`Prompt section not found: ${startHeading}`);
	const startAfter = markdown.indexOf('\n', start);
	if (startAfter === -1) throw new Error(`Malformed prompt markdown near: ${startHeading}`);

	const end = markdown.indexOf(endHeading, startAfter + 1);
	if (end === -1) throw new Error(`Prompt section not found: ${endHeading}`);
	return markdown.slice(startAfter + 1, end);
}

const systemSection = extractSection(dailyNewsMd, '### System Prompt', '### User Instruction');
export const DAILY_NEWS_SYSTEM_PROMPT = stripBlockquotes(systemSection);

export function buildDailyNewsUserPrompt(args: {
	currentDate: string;
	targetVocabulary: string[];
	topicPreference: string;
}) {
	const vocabulary = JSON.stringify(args.targetVocabulary);
	return [
		'输入数据:',
		`CURRENT_DATE: "${args.currentDate}"`,
		`TARGET_VOCABULARY: ${vocabulary}`,
		`TOPIC_PREFERENCE: "${args.topicPreference}"`,
		'',
		'格式要求（重要）：',
		'- `articles[*].content` 必须是纯文本/Markdown，使用“正常段落排版”。',
		'- 段落之间用一个空行分隔（即包含 `\\n\\n`）。',
		'- 不要“一句一行”。每段建议 2-4 句。',
		'- 不要在正文里直接写出 CURRENT_DATE（除非是新闻本身需要）。',
		'',
		'词汇要求（重要）：',
		'- 自然优先：不要为了塞词牺牲可读性；允许少量缺失，并在 `missing_words` 中如实列出。',
		'',
		'请执行生成。'
	].join('\n');
}
