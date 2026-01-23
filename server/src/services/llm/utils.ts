/**
 * LLM 工具函数模块
 *
 * 提供 LLM 服务层的通用工具函数，主要用于：
 * 1. LLM 输出的后处理（JSON 提取、格式归一化）
 * 2. URL 解析与重定向处理
 * 3. 候选词处理
 *
 * 设计原则：
 * - 容错优先：LLM 输出格式不可控，工具函数需健壮处理各种边缘情况
 * - 纯函数：无副作用，便于测试
 */

import type { DailyNewsOutput } from '../../schemas/dailyNews';

// ════════════════════════════════════════════════════════════════
// 常量定义
// ════════════════════════════════════════════════════════════════

/** 选词数量下限：至少选择 1 个词 */
export const WORD_SELECTION_MIN_WORDS = 1;

/** 选词数量上限：最多选择 8 个词，避免文章过于拥挤 */
export const WORD_SELECTION_MAX_WORDS = 8;

/** 来源 URL 数量上限：只保留最权威的 1 个来源 */
export const SOURCE_URL_LIMIT = 1;

// ════════════════════════════════════════════════════════════════
// 类型定义
// ════════════════════════════════════════════════════════════════

/**
 * 候选词类型
 *
 * type 字段用于优先级排序：
 * - 'new': 新学词汇，优先使用
 * - 'review': 复习词汇，作为填充
 */
export type CandidateWord = {
    word: string;
    type: 'new' | 'review';
};

// ════════════════════════════════════════════════════════════════
// 文章内容处理
// ════════════════════════════════════════════════════════════════

/**
 * [Content Normalization Strategy]
 * ------------------------------------------------------------------
 * 问题：LLM 有时会"忘记"分段，输出一大坨连在一起的文本。
 * 策略 (Fallback Pipeline)：
 * 1. 快乐路径：若检测到 `\n\n`，直接信任并清理首尾。
 * 2. 兜底修复：若无分段，基于句末标点 (`.!?` + 大写开头) 强行拆句。
 * 3. 动态重组：根据 `level` (难度) 将碎片句子按照 (2/2/3) 的密度重组为段落，
 *    避免 L3 级别的长文因为没分段而变成"文字墙"吓退用户。
 */
function ensureContentParagraphs(content: string, level: number) {
    const text = content.replace(/\r\n/g, '\n').trim();
    if (!text) return text;

    // 已有段落分隔，只做格式清理
    if (/\n\s*\n/.test(text)) {
        const paragraphs = text
            .split(/\n\s*\n+/)
            .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim())
            .filter(Boolean);
        return paragraphs.join('\n\n');
    }

    // 无段落分隔，按句子重新拆分
    const flattened = text.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!flattened) return flattened;

    // 在句末标点后插入换行（后面紧跟大写字母或数字）
    const withLines = flattened.replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1\n');
    const sentences = withLines
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

    if (sentences.length <= 1) return flattened;

    // 根据难度级别决定段落数
    const desiredParagraphs = level === 1 ? 2 : level === 2 ? 2 : 3;
    const perParagraph = Math.max(2, Math.ceil(sentences.length / desiredParagraphs));

    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += perParagraph) {
        paragraphs.push(sentences.slice(i, i + perParagraph).join(' '));
    }
    return paragraphs.join('\n\n');
}

/**
 * 归一化 DailyNewsOutput
 *
 * 对所有文章内容应用段落格式化
 */
export function normalizeDailyNewsOutput(output: DailyNewsOutput): DailyNewsOutput {
    return {
        ...output,
        articles: output.articles.map((a) => ({
            ...a,
            content: ensureContentParagraphs(a.content, a.level),
        }))
    };
}

// ════════════════════════════════════════════════════════════════
// URL 处理
// ════════════════════════════════════════════════════════════════

/**
 * 清理 URL 格式
 *
 * 处理 LLM 输出中常见的 URL 格式问题：
 * - 尖括号包裹：<https://example.com>
 * - 尾部标点：https://example.com.
 * - Markdown 链接残留：https://example.com)
 */
function normalizeUrl(raw: string) {
    return raw
        .trim()
        .replace(/^<+/, '')
        .replace(/>+$/, '')
        .replace(/[)\]}<>.,;:，。；：]+$/, '');
}

// ════════════════════════════════════════════════════════════════
// URL 提取
// ════════════════════════════════════════════════════════════════

/** 从文本中提取 HTTP(S) URL */
export function extractHttpUrlsFromText(text: string): string[] {
    const matches = text.match(/https?:\/\/[^\s<>()[\]]+/g) ?? [];
    return matches.map(normalizeUrl).filter(Boolean);
}

/**
 * [Deep URL Extraction]
 * 意图：从任意嵌套的未知结构 (JSON/List/Object) 中刮取所有 HTTP 链接。
 * 
 * 安全机制: **Cycle Detection (环检测)**
 * - 风险：输入的 `value` 可能包含环形引用 (Circular Reference)。
 * - 防御：使用 `WeakSet` (或 Set) 追踪已访问对象，遇到重复立即回退 (Backtrack)。
 */
export function collectHttpUrlsFromUnknown(value: unknown): string[] {
    const urls: string[] = [];
    const seen = new Set<unknown>();

    const walk = (v: unknown) => {
        if (v == null) return;
        if (typeof v === 'string') {
            urls.push(...extractHttpUrlsFromText(v));
            return;
        }
        if (typeof v !== 'object') return;
        if (seen.has(v)) return;  // 防止循环引用
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

/**
 * 移除 LLM 输出中的行内引用标记
 * 
 * 常见格式：[1], [2, 3], [1,2,3] 等
 * 这些是 LLM 在使用搜索工具后自动添加的引用标注
 */
export function stripCitations(text: string): string {
    const citationRegex = /\[\s*\d+(?:,\s*\d+)*\s*\]/g;
    return text.replace(citationRegex, '');
}

// ════════════════════════════════════════════════════════════════
// URL 重定向解析
// ════════════════════════════════════════════════════════════════

/**
 * 解析 Gemini Google Search 返回的重定向 URL
 *
 * 问题背景：
 * Gemini 的 Grounding 功能返回的 URL 是 Google 的重定向链接，
 * 格式：vertexaisearch.cloud.google.com/grounding-api-redirect/...
 * 需要解析获取真实的新闻来源地址。
 *
 * 策略：
 * - 使用 HEAD 请求跟踪重定向（避免下载完整内容）
 * - 5 秒超时，超时返回原 URL
 * - 解析失败不阻断主流程
 */
export async function resolveRedirectUrl(url: string): Promise<string> {
    if (!url.includes('vertexaisearch.cloud.google.com/grounding-api-redirect')) {
        return url;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.url && res.url !== url) {
            console.log(`[URL Resolver] Resolved: ${url.slice(0, 80)}... -> ${res.url}`);
            return res.url;
        }

        return url;
    } catch (error) {
        // 解析失败返回原 URL，不影响主流程
        console.warn(`[URL Resolver] Failed to resolve: ${url.slice(0, 80)}...`, error);
        return url;
    }
}

/** 批量解析 URL 重定向，自动去重 */
export async function resolveRedirectUrls(urls: string[]): Promise<string[]> {
    const resolved = await Promise.all(urls.map(resolveRedirectUrl));
    // 去重（多个重定向可能指向同一真实 URL）
    return Array.from(new Set(resolved));
}

/**
 * 从 Stage 1 响应中收集并解析 Source URLs
 *
 * 处理逻辑：
 * 1. 提取 validated 中的 source/sources 字段
 * 2. 从 newsSummary 和 responseText 中提取 HTTP URLs
 * 3. 合并 Grounding URLs (Gemini 特有)
 * 4. 去重并限制数量 (最多 5 个)
 * 5. 解析重定向 URL
 */
export async function buildSourceUrls(args: {
    validated: { source?: string; sources?: string[] };
    newsSummary: string;
    responseText: string;
    groundingUrls?: string[];
    limit?: number;
}): Promise<string[]> {
    const { validated, newsSummary, responseText, groundingUrls = [], limit = 5 } = args;

    // 1. 提取 validated 中的 source(s)
    let rawSources: string[] = [];
    if (validated.source) {
        rawSources = [validated.source];
    } else if (validated.sources) {
        rawSources = validated.sources;
    }

    // 2. 从文本中提取 URLs
    const textUrls = extractHttpUrlsFromText(newsSummary)
        .concat(extractHttpUrlsFromText(responseText));

    // 3. 合并所有 URL 并去重
    const allUrls = Array.from(new Set([
        ...rawSources,
        ...textUrls,
        ...groundingUrls
    ])).slice(0, limit);

    // 4. 解析重定向
    return resolveRedirectUrls(allUrls);
}

// ════════════════════════════════════════════════════════════════
// JSON 提取
// ════════════════════════════════════════════════════════════════

/**
 * 从模糊文本中提取 JSON 部分
 *
 * 处理策略（按优先级）：
 * 1. 提取 ```json 代码块
 * 2. 提取任意 ``` 代码块（首字符为 {）
 * 3. 兜底：从第一个 { 到最后一个 }
 *
 * 为什么需要这个函数？
 * LLM 经常在 JSON 前后添加解释性文字，直接 JSON.parse 会失败
 */
export function extractJson(text: string): string {
    // 优先匹配 ```json 代码块
    const codeBlockMatch = text.match(/```json\n?([\s\S]*?)\n?```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
        return codeBlockMatch[1].trim();
    }

    // 匹配任意代码块
    const genericBlockMatch = text.match(/```\n?([\s\S]*?)\n?```/);
    if (genericBlockMatch && genericBlockMatch[1]) {
        const potential = genericBlockMatch[1].trim();
        if (potential.startsWith('{')) return potential;
    }

    // 兜底：查找 { 和 }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1).trim();
    }

    // 原样返回，交给 JSON.parse 报错
    return text.trim();
}

// ════════════════════════════════════════════════════════════════
// [RESERVED] 多轮对话支持
// 
// 设计意图：为未来实现 Multi-Turn Conversation 能力预留的类型和工具函数。
// 当前未启用。如需使用，可在 analyzer.ts 或新的对话模块中调用。
// ════════════════════════════════════════════════════════════════

/** 通用消息格式（跨 Provider 兼容） */
export interface AgnosticMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/** 简化的 LLM 客户端接口（用于 analyzer.ts） */
export interface ILLMClient {
    generateContent(
        messages: AgnosticMessage[],
        options?: {
            system?: string;
            model?: string;
        }
    ): Promise<{
        text: string;
        usage?: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
        };
    }>;
}

/** 将 LLM 响应追加到对话历史 */
export function appendResponseToHistory(history: AgnosticMessage[], responseText: string): AgnosticMessage[] {
    return [
        ...history,
        { role: 'assistant', content: responseText }
    ];
}
