/**
 * [句法分析引擎 (analyzer.ts)]
 * ------------------------------------------------------------------
 * 功能：利用 LLM 进行 SVO (主谓宾) 句法成分标注，支持长文分块处理。
 *
 * 核心算法：
 * - 智能分句 (Smart Segmentation): 使用 `Intl.Segmenter` + 启发式规则 (合并中间名缩写) 解决正则分句的边缘 Case。
 * - 坐标映射 (Offset Mapping): 将 LLM 返回的局部 Token 坐标映射回全局文章偏移量，解决 "Token 丢失" 问题。
 *
 * 性能考量：
 * - Sweet Spot Batching: 将句子按 5-10 句/段分组。组太小浪费 Prompt Token，组太大导致 Attention 丢失 (Lost-in-the-Middle)。
 */

import { extractJson } from './utils';
import type { LLMProvider } from './types';
import { ANALYSIS_SYSTEM_INSTRUCTION } from './prompts.shared';
import type { AnalysisRole, SentenceData, AnalysisAnnotation } from '../../db/jsonTypes';

// ============ 类型定义 ============

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}


/** LLM 返回的单个标注 */
interface LLMAnnotation {
    text: string;
    role: string;
}

/** 段落分组 */
interface ParagraphGroup {
    index: number;
    sentences: SentenceData[];
}

/** 单个 Article 输入格式 */
export interface ArticleInput {
    level: 1 | 2 | 3;
    content: string;
    level_name: string;
    title?: string;
}

/** 单个 Article 输出格式 (包含分析结果) */
export interface ArticleWithAnalysis extends ArticleInput {
    sentences: SentenceData[];
    structure: AnalysisAnnotation[];
}

/** Stage 4 输入 */
interface AnalyzerInput {
    client: LLMProvider;
    model: string;
    articles: ArticleInput[];
    /** 已完成的 levels (用于恢复) */
    completedLevels?: ArticleWithAnalysis[];
    /** 每完成一个 Level 的回调 (用于 checkpoint) */
    onLevelComplete?: (completedArticles: ArticleWithAnalysis[]) => Promise<void>;
}

/** 阶段 4 输出 */
interface AnalyzerOutput {
    articles: ArticleWithAnalysis[];
    usage: Record<string, TokenUsage>;
}

// ============ 常量定义 ============

const VALID_ROLES: readonly AnalysisRole[] = [
    's', 'v', 'o', 'io', 'cmp',
    'rc', 'pp', 'adv', 'app',
    'pas', 'con', 'inf', 'ger', 'ptc'
];

// ============ 辅助函数 ============

/**
 * [Smart Segmentation Algorithm]
 * 意图：解决 `Intl.Segmenter` 对 "Middle Initial" (如 "Jason W. Ricketts") 误判为句子结束的问题。
 * 启发式规则：
 * 1. 模式匹配：检测是否以 " [A-Z]." 结尾。
 * 2. 排除法：若下一段以常用句首词 (But/The/And) 开头，则承认分句；否则视为名字缩写的一部分，进行合并。
 */

// 常见句首词黑名单：如果下一段以这些词开头，则认为是新句子，不合并。
const SENTENCE_STARTERS = new Set([
    'It', 'The', 'This', 'That', 'He', 'She', 'They', 'We', 'I',
    'But', 'And', 'Or', 'So', 'Then', 'If', 'When', 'As', 'However',
    'Meanwhile', 'Moreover', 'Furthermore', 'Therefore', 'Thus',
    'In', 'On', 'At', 'For', 'With', 'By', 'From', 'To', 'A', 'An'
]);

function splitIntoSentences(content: string): SentenceData[] {
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    const segments = Array.from(segmenter.segment(content));

    // Post-processing: Merge segments split by middle initials
    const mergedSegments: { index: number; segment: string }[] = [];

    for (const seg of segments) {
        const last = mergedSegments[mergedSegments.length - 1];

        // Condition: Previous segment ends with " [A-Z]. " (Middle Initial pattern)
        if (last && /[ ][A-Z]\.\s*$/.test(last.segment)) {
            // Check Exclusion: Does the next segment start with a common sentence starter?
            const nextFirstWord = seg.segment.trim().split(/\s+/)[0] || '';
            const isSentenceStarter = SENTENCE_STARTERS.has(nextFirstWord);

            if (!isSentenceStarter) {
                // Merge: This is likely a continuation of a name (e.g., "W. Ricketts")
                last.segment += seg.segment;
                continue;
            }
        }
        mergedSegments.push({ index: seg.index, segment: seg.segment });
    }

    // Rebuild SentenceData with correct offsets
    // Note: After merging, the 'index' of the first segment in a merged group remains correct.
    // The 'end' needs to be recalculated based on the merged segment length.
    return mergedSegments
        .map((seg, idx) => ({
            id: idx,
            start: seg.index,
            end: seg.index + seg.segment.length,
            text: seg.segment.trim()
        }))
        .filter(s => s.text.length > 0);
}

/**
 * 按段落分组句子
 */
function groupSentencesByParagraph(content: string, sentences: SentenceData[]): ParagraphGroup[] {
    const groups: ParagraphGroup[] = [];
    let currentSentences: SentenceData[] = [];
    let groupIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i]!;
        const prevEnd = i > 0 ? sentences[i - 1]!.end : 0;
        const gap = content.substring(prevEnd, sentence.start);

        const hasParagraphBreak = i > 0 && gap.includes('\n');

        if (hasParagraphBreak && currentSentences.length > 0) {
            groups.push({ index: groupIndex++, sentences: [...currentSentences] });
            currentSentences = [];
        }

        currentSentences.push(sentence);
    }

    if (currentSentences.length > 0) {
        groups.push({ index: groupIndex, sentences: currentSentences });
    }

    return groups;
}

/**
 * 构建段落批量分析的 User Prompt
 * 
 * 注意：详细的角色定义和输出格式已移至 ANALYSIS_SYSTEM_INSTRUCTION (System Prompt)。
 * 这里只需提供待分析的句子列表。
 */
function buildParagraphPrompt(sentences: SentenceData[]): string {
    const numberedSentences = sentences
        .map((s, idx) => `[S${idx}] ${s.text}`)
        .join('\n\n');

    return `<task>
请分析以下段落中每个句子的语法成分。

<paragraph>
${numberedSentences}
</paragraph>

按照 System Prompt 中的 <output_schema> 格式返回 JSON。
</task>`;
}

/**
 * 解析段落分析响应
 */
function parseParagraphResponse(text: string, sentenceCount: number): Map<number, LLMAnnotation[]> {
    const result = new Map<number, LLMAnnotation[]>();

    for (let i = 0; i < sentenceCount; i++) {
        result.set(i, []);
    }

    try {
        const jsonStr = extractJson(text);
        const parsed = JSON.parse(jsonStr);

        if (typeof parsed !== 'object' || parsed === null) {
            console.warn('[ParagraphAnalyzer] Response is not an object');
            return result;
        }

        for (const [key, value] of Object.entries(parsed)) {
            const idxMatch = key.match(/^S?(\d+)$/);
            if (!idxMatch) continue;

            const idx = parseInt(idxMatch[1]!);
            if (idx >= sentenceCount) continue;

            if (Array.isArray(value)) {
                const validAnnotations = (value as any[]).filter(item =>
                    typeof item.text === 'string' &&
                    typeof item.role === 'string' &&
                    item.text.length > 0
                );
                result.set(idx, validAnnotations);
            }
        }
    } catch (e) {
        console.error('[ParagraphAnalyzer] Failed to parse response:', e);
    }

    return result;
}

/**
 * [Coordinate Mapping Algorithm]
 * 问题：LLM 返回的只是 Token 文本 (如 "apple")，丢失了它在原文章中的位置信息。
 * 挑战：文章中可能有 10 个 "apple"，如何确定 LLM 指的是哪一个？
 * 
 * 解决方案：Scope Narrowing (作用域收窄)
 * 1. 锚点：我们已知当前正在分析的是 sentences[i]。
 * 2. 搜索：只在 `sentence.text` 范围内搜索 LLM 返回的词。
 * 3. 变换：GlobalOffset = SentenceStart (已知) + LocalIndex (搜索结果)。
 * 
 * 约束：若一个句子内出现两次 "apple" 且 LLM 未通过上下文区分，默认匹配第一个。这在语法分析场景下通常可接受。
 */
function convertToGlobalOffsets(
    annotations: LLMAnnotation[],
    sentence: SentenceData,
    originalContent: string
): AnalysisAnnotation[] {
    const results: AnalysisAnnotation[] = [];

    for (const ann of annotations) {
        const role = ann.role.toLowerCase() as AnalysisRole;
        if (!VALID_ROLES.includes(role)) {
            continue;
        }

        const sentenceContent = originalContent.substring(sentence.start, sentence.end);
        const localIndex = sentenceContent.indexOf(ann.text);

        if (localIndex === -1) {
            continue;
        }

        results.push({
            start: sentence.start + localIndex,
            end: sentence.start + localIndex + ann.text.length,
            role,
            text: ann.text
        });
    }

    return results;
}

/**
 * 分析单个 Article Level 的核心流程
 * 
 * 流程细节：
 * 1. 预处理：分句 -> 按段落分组。
 * 2. 过滤：跳过过短的段落 (如标题或极短描述)，节省 Token。
 * 3. 迭代调用：对每个有效段落构建 Prompt 并调用 LLM。
 * 4. 结果聚合：解析 LLM 响应，转换为全局 Offset，并收集 Token 用量。
 * 5. 错误隔离：单个段落分析失败会记录日志并抛错，由上层决定是否重试（目前策略是抛出异常中断）。
 */
async function analyzeArticle(args: {
    client: LLMProvider;
    // model: string; // Removed unused model
    article: ArticleInput;
}): Promise<{ result: ArticleWithAnalysis; usage: TokenUsage | undefined }> {
    const { article, client } = args;

    if (!article.content) {
        return {
            result: { ...article, sentences: [], structure: [] },
            usage: undefined
        };
    }

    console.log(`[SentenceAnalyzer] Processing Level ${article.level}...`);

    // 1. 分句
    const sentences = splitIntoSentences(article.content);
    // 2. 按段落分组
    const paragraphs = groupSentencesByParagraph(article.content, sentences);

    const allAnalyses: AnalysisAnnotation[] = [];
    let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
        const para = paragraphs[pIdx]!;

        const totalWords = para.sentences.reduce(
            (sum, s) => sum + s.text.split(/\s+/).length, 0
        );
        if (totalWords < 5) {
            continue;
        }

        const prompt = buildParagraphPrompt(para.sentences);

        try {
            // Stage 4 使用默认工具配置
            const response = await client.generate({
                prompt: prompt,
                system: ANALYSIS_SYSTEM_INSTRUCTION
            });

            const responseText = response.text;
            const usage = response.usage;

            if (usage) {
                totalUsage.inputTokens += usage.inputTokens;
                totalUsage.outputTokens += usage.outputTokens;
                totalUsage.totalTokens += usage.totalTokens;
            }

            const paragraphAnalyses = parseParagraphResponse(responseText, para.sentences.length);

            for (let sIdx = 0; sIdx < para.sentences.length; sIdx++) {
                const sentence = para.sentences[sIdx]!;
                const annotations = paragraphAnalyses.get(sIdx) || [];
                const converted = convertToGlobalOffsets(annotations, sentence, article.content);
                allAnalyses.push(...converted);
            }

        } catch (e) {
            console.error(`[SentenceAnalyzer] Failed on paragraph ${pIdx}:`, e);
            throw e;
        }
    }

    return {
        result: {
            ...article,
            sentences,
            structure: allAnalyses.sort((a, b) => a.start - b.start)
        },
        usage: totalUsage
    };
}

// ============ 核心导出 ============

/**
 * 运行全量语法分析（支持增量 Checkpoint 恢复）
 * 
 * 设计思路：
 * 接收 3 个难度等级的文章，顺序进行分析。
 * 每完成一个 Level，都会触发 onLevelComplete 回调。
 * 这允许 TaskExecutor 在数据库中保存已完成的 Levels。
 * 
 * 如果任务在分析 Level 2 时崩溃，下次重启时：
 * 1. completedLevels 参数将包含 Level 1 的结果。
 * 2. 本函数会识别并跳过 Level 1，直接从 Level 2 开始。
 */
export async function runSentenceAnalysis(args: AnalyzerInput): Promise<AnalyzerOutput> {
    const usageAccumulator: Record<string, TokenUsage> = {};
    const { client, articles, completedLevels = [], onLevelComplete } = args; // Removed unused model

    const completedArticles: ArticleWithAnalysis[] = [...completedLevels];
    const completedLevelNums = new Set(completedArticles.map(a => a.level));

    const pendingArticles = articles.filter(a => !completedLevelNums.has(a.level));

    if (completedArticles.length > 0) {
        console.log(`[SentenceAnalyzer] Resuming from checkpoint. Completed: ${completedArticles.map(a => a.level).join(', ')}`);
    }

    for (const article of pendingArticles) {
        const { result, usage } = await analyzeArticle({ client, article });

        completedArticles.push(result);
        if (usage) {
            usageAccumulator[`level_${article.level}`] = usage;
        }

        if (onLevelComplete) {
            console.log(`[SentenceAnalyzer] Checkpoint: Level ${article.level} complete`);
            await onLevelComplete(completedArticles);
        }
    }

    completedArticles.sort((a, b) => a.level - b.level);

    return { articles: completedArticles, usage: usageAccumulator };
}
