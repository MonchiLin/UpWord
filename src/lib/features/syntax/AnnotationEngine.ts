/**
 * [语法标注聚合引擎 (AnnotationEngine.ts)]
 * ------------------------------------------------------------------
 * 功能：前端视觉渲染的核心，负责将"多个异构数据源"合并为单一的"渲染树"。
 *
 * 核心算法: **Data Fusion & Flattening**
 * 1. Data Fusion: 
 *    - 输入：Raw Text (底色) + Sentences (骨架) + Syntax Analysis (高亮)。
 *    - 输出：AST (抽象语法树)。
 * 2. Interval Flattening (区间扁平化):
 *    - 挑战：LLM 返回的区间可能重叠 (Overlap) 或错误嵌套。
 *    - 策略：采用 "Greedy Longest Match" (贪心最长匹配) 策略，
 *      遇到交叉区间时，优先保留最早开始且最长的区间，严格丢弃(Pruning)后续冲突的短区间，
 *      以确保生成的 DOM 结构合法 (无交叉 div)。
 */

import type { AnalysisRole } from './SyntaxDefinitions';

// ============ Types ============

export interface SentenceData {
    id: number;
    start: number;
    end: number;
    text: string;
}

export interface AnalysisData {
    start: number;
    end: number;
    role: AnalysisRole;
    text?: string;
}

/** 单词匹配配置 */
export interface WordMatchConfig {
    lemma: string;       // 词根 (e.g., "run")
    forms: string[];     // 所有变形 (e.g., ["run", "runs", "ran", "running"])
}

/** 渲染节点类型 */
export type RenderNode =
    | { type: 'text'; content: string }
    | { type: 'sentence'; sid: number; children: RenderNode[] }
    | { type: 'analysis'; role: AnalysisRole; children: RenderNode[] }
    | { type: 'word'; lemma: string; children: RenderNode[] };


// ============ Core Logic ============

/**
 * 语法分析树构建 (Main Entry)
 *
 * 算法: 分治策略 (Divide and Conquer)
 *
 * 流程:
 * 1. **切段**: 先按 `Sentences` 将全文切分为互不重叠的段落 (Paragraphs)。
 *    这是第一层分治，因为自然语言中“句子”是语法分析的天然边界。
 * 2. **递归**: 对每个句子内部，调用 `buildAnalysisNodes` 进行微观层面的区间合并。
 */
export function buildAnalysisTree(
    content: string,
    sentences: SentenceData[],
    analyses: AnalysisData[],
    wordConfigs: WordMatchConfig[] = []
): RenderNode[][] {
    const paragraphs: RenderNode[][] = [];
    let currentParagraph: RenderNode[] = [];
    let cursor = 0;

    // 检测是否为段落分隔
    const isParagraphBreak = (text: string) => text.includes('\n');

    for (const sentence of sentences) {
        // 检查句子前的间隙是否包含段落分隔
        if (sentence.start > cursor) {
            const gap = content.substring(cursor, sentence.start);

            if (isParagraphBreak(gap)) {
                // 遇到段落分隔，保存当前段落，开始新段落
                if (currentParagraph.length > 0) {
                    paragraphs.push(currentParagraph);
                    currentParagraph = [];
                }
            } else if (gap.trim()) {
                // 非段落分隔的有意义文本
                currentParagraph.push({ type: 'text', content: gap });
            }
        }

        // 获取该句子内的分析标注
        // 获取该句子内的分析标注
        const validAnalyses = Array.isArray(analyses) ? analyses : [];
        const sentenceAnalyses = validAnalyses.filter(
            s => s.start >= sentence.start && s.end <= sentence.end
        );

        // 构建句子内部的 AST
        const sentenceContent = content.substring(sentence.start, sentence.end);
        const innerNodes = buildAnalysisNodes(
            sentenceContent,
            sentenceAnalyses,
            sentence.start,
            wordConfigs
        );

        currentParagraph.push({
            type: 'sentence',
            sid: sentence.id,
            children: innerNodes
        });

        cursor = sentence.end;
    }

    // 处理最后一段
    if (cursor < content.length) {
        const remaining = content.substring(cursor);
        if (remaining.trim()) {
            currentParagraph.push({ type: 'text', content: remaining });
        }
    }

    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
    }

    return paragraphs;
}

/**
 * [Interval Solver] 句子级 AST 构建器
 *
 * 核心问题: **Interval Scheduling Maximization (区间调度最大化)**
 *
 * 冲突策略: **Winner Takes All (赢家通吃)**
 * - 规则：如果区间 B 与区间 A 部分重叠 (Cross-Boundary Intersect)，
 *   且 A 已经被接纳 (start 更早或 length 更长)，则 B 被完全丢弃。
 * - 理由：HTML 是树状结构，无法渲染 [A..[B..]A..]B 这样的拓扑。
 *   且在语法分析中，这种交叉通常意味着 LLM 产生了幻觉或定位偏移。
 */
function buildAnalysisNodes(
    sentenceText: string,
    analyses: AnalysisData[],
    globalOffset: number,
    wordConfigs: WordMatchConfig[] = []
): RenderNode[] {
    const nodes: RenderNode[] = [];

    // [关键排序]: 决定了树的层级结构
    // 优先处理最左侧、最宽的区间。
    const sorted = [...analyses].sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return (b.end - b.start) - (a.end - a.start); // Longest first
    });

    // 第一遍扫描: 剔除无法嵌套的坏节点
    const nonOverlapping: AnalysisData[] = [];
    let lastEnd = -1;

    for (const item of sorted) {
        // 简单处理: 目前只支持平铺的不重叠区间 (Level 1 Implementation)
        // 如果需要支持嵌套高亮 (如主语里包含定语)，需要改成递归算法。
        // 当前策略: 赢家通吃 (Winner takes all)，忽略所有重叠部分，保持 UI 干净。
        if (item.start < lastEnd) {
            continue;
        }
        nonOverlapping.push(item);
        lastEnd = item.end;
    }

    let cursor = 0;

    for (const item of nonOverlapping) {
        const localStart = item.start - globalOffset;
        const localEnd = item.end - globalOffset;

        // 边界保护
        if (localStart < 0 || localEnd > sentenceText.length) {
            continue;
        }

        // 填补空隙 (Gap Filling)
        if (localStart > cursor) {
            const textContent = sentenceText.substring(cursor, localStart);
            nodes.push(...markTargetWords(textContent, wordConfigs));
        }

        // 生成高亮节点
        const itemText = sentenceText.substring(localStart, localEnd);
        nodes.push({
            type: 'analysis',
            role: item.role,
            children: markTargetWords(itemText, wordConfigs)
        });

        cursor = localEnd;
    }

    // 填补尾部
    if (cursor < sentenceText.length) {
        const remaining = sentenceText.substring(cursor);
        nodes.push(...markTargetWords(remaining, wordConfigs));
    }

    return nodes;
}

/**
 * 目标单词高亮器
 * 职责: 最底层的 Tokenizer，负责识别并标记生词 (Keywords)。
 */
function markTargetWords(text: string, wordConfigs: WordMatchConfig[]): RenderNode[] {
    if (wordConfigs.length === 0 || !text.trim()) {
        return [{ type: 'text', content: text }];
    }

    const results: RenderNode[] = [];
    // Tokenizer: 仅匹配英文单词，保留标点符号在外部
    const wordRegex = /([a-zA-Z0-9'-]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
        const word = match[0];
        const wordStart = match.index;
        const lowercaseWord = word.toLowerCase();

        // 补全前缀
        if (wordStart > lastIndex) {
            results.push({ type: 'text', content: text.substring(lastIndex, wordStart) });
        }

        // 匹配检查
        const config = wordConfigs.find(c => c.forms.includes(lowercaseWord));

        if (config) {
            results.push({
                type: 'word',
                lemma: config.lemma,
                children: [{ type: 'text', content: word }]
            });
        } else {
            results.push({ type: 'text', content: word });
        }

        lastIndex = wordStart + word.length;
    }

    // 补全后缀
    if (lastIndex < text.length) {
        results.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return results;
}
