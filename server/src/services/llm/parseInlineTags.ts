/**
 * 解析 LLM 返回的内联标签文本，提取结构数据
 * 
 * 输入: "<S>The quick fox</S> <V>jumps</V> <PP>over the lazy dog</PP>."
 * 输出: { plainText: "The quick fox jumps over the lazy dog.", structures: [...] }
 */

import type { GeminiStructureData } from './types';

// 支持的标签类型 (大小写不敏感)
const TAG_PATTERN = /<(S|V|O|RC|PP|PAS|CON)>([\s\S]*?)<\/\1>/gi;

interface ParseResult {
    plainText: string;
    structures: (GeminiStructureData[0] & { extract: string })[];
}

/**
 * 解析内联标签，返回干净文本和结构数据
 * 
 * 使用递归正则匹配处理嵌套标签
 */
export function parseInlineTags(taggedText: string): ParseResult {
    const structures: GeminiStructureData = [];

    function processText(text: string, baseOffset: number): string {
        let result = '';
        let lastIndex = 0;

        // Reset regex for each call
        const regex = new RegExp(TAG_PATTERN.source, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Add text before this match
            const beforeText = text.slice(lastIndex, match.index);
            result += beforeText;

            const role = match[1]!.toLowerCase() as GeminiStructureData[0]['role'];
            const innerContent = match[2]!;

            // Calculate start position in result
            const startPos = baseOffset + result.length;

            // Recursively process inner content (handles nested tags)
            const processedInner = processText(innerContent, startPos);

            // Add processed inner content to result
            result += processedInner;

            // Calculate end position
            const endPos = baseOffset + result.length;

            // Record this structure
            structures.push({
                start: startPos,
                end: endPos,
                role: role,
                extract: processedInner
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after last match
        result += text.slice(lastIndex);

        return result;
    }

    const plainText = processText(taggedText, 0);

    // Sort by start position
    structures.sort((a, b) => a.start - b.start);

    return { plainText, structures: structures as (GeminiStructureData[0] & { extract: string })[] };
}

/**
 * 规范化文本，用于容错比较
 * 我们主要比对“纯文字内容”是否一致。
 * 策略：移除所有空白符，并移除所有可能的结构标签 <TAG> 或 </TAG>。
 */
export function normalizeText(text: string): string {
    return text
        .replace(/<\/?(S|V|O|RC|PP|PAS|CON)>/gi, '') // 移除所有已知的中标标签（无论闭合与否）
        .replace(/\s+/g, '');                        // 极其严格：移除所有空白符（空格、换行、制表符等）
}

/**
 * 验证解析结果的正确性
 */
export function validateParseResult(result: ParseResult, originalText: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. 结构偏移量验证 (内部一致性)
    for (const s of result.structures) {
        const extracted = result.plainText.substring(s.start, s.end);
        if (extracted !== s.extract) {
            errors.push(`Internal Offset mismatch for ${s.role}: expected "${s.extract}", got "${extracted}"`);
        }
    }

    // 2. 文本完整性验证 (Fail Fast 核心)
    const normPlain = normalizeText(result.plainText);
    const normOrig = normalizeText(originalText);

    if (normPlain !== normOrig) {
        // 找出大致差异位置 (简易实现)
        let diffIdx = 0;
        while (diffIdx < normPlain.length && diffIdx < normOrig.length && normPlain[diffIdx] === normOrig[diffIdx]) {
            diffIdx++;
        }
        const snippetPlain = normPlain.substring(Math.max(0, diffIdx - 20), Math.min(normPlain.length, diffIdx + 20));
        const snippetOrig = normOrig.substring(Math.max(0, diffIdx - 20), Math.min(normOrig.length, diffIdx + 20));

        errors.push(`Text Integrity Violation! LLM mutated the original text.`);
        errors.push(`  At index ~${diffIdx}`);
        errors.push(`  Original: "...${snippetOrig}..."`);
        errors.push(`  LLM Result: "...${snippetPlain}..."`);
    }

    return { valid: errors.length === 0, errors };
}
