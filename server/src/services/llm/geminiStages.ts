/**
 * Gemini 生成阶段函数
 * 
 * 四阶段 CoT 流水线：选词 → 研究 → 草稿 → JSON 转换
 * 使用 Gemini REST API 原生格式
 */

import type { DailyNewsOutput } from '../../schemas/dailyNews';
import { dailyNewsOutputSchema } from '../../schemas/dailyNews';
import { SOURCE_URL_LIMIT } from './limits';
import {
    collectHttpUrlsFromUnknown,
    extractHttpUrlsFromText,
    normalizeWordSelectionPayload
} from './helpers';
import {
    WORD_SELECTION_SYSTEM_INSTRUCTION,
    RESEARCH_SYSTEM_INSTRUCTION,
    DRAFT_SYSTEM_INSTRUCTION,
    JSON_SYSTEM_INSTRUCTION,
    buildDraftGenerationUserPrompt,
    buildJsonConversionUserPrompt,
    buildResearchUserPrompt,
    buildWordSelectionUserPrompt
} from './prompts';
import {
    extractGeminiText,
    safeGeminiCall,
    stripMarkdownCodeBlock,
    type GeminiClient,
    type GeminiMessage,
    type ThinkingLevel
} from './geminiClient';
import type { CandidateWord } from './types';
import { wordSelectionSchema } from './types';

// Gemini 对话历史类型
export type GeminiHistory = GeminiMessage[];

// Thinking 级别配置
export const geminiThinkingLevel: ThinkingLevel = 'high';

// ============================================
// Stage 1: 选词
// ============================================

export async function runGeminiWordSelection(args: {
    client: GeminiClient;
    history: GeminiHistory;
    model: string;
    candidateWords: CandidateWord[];
    topicPreference: string;
    currentDate: string;
}) {
    console.log('[Gemini Stage 1/4] Word Selection - START', { candidateCount: args.candidateWords.length, model: args.model });
    const stageStart = Date.now();

    const candidateWordsJson = JSON.stringify(args.candidateWords, null, 2);
    const systemPrompt = WORD_SELECTION_SYSTEM_INSTRUCTION;
    const userPrompt = buildWordSelectionUserPrompt({
        candidateWordsJson,
        topicPreference: args.topicPreference,
        currentDate: args.currentDate
    });

    args.history.push({ role: 'user', parts: [{ text: userPrompt }] });

    const response = await safeGeminiCall('GeminiWordSelection', async () => {
        return args.client.generateContent(args.model, {
            contents: args.history,
            generationConfig: {
                temperature: 1,
                responseMimeType: 'application/json',
                thinkingConfig: {
                    includeThoughts: true,
                    thinkingLevel: geminiThinkingLevel
                }
            },
            systemInstruction: { parts: [{ text: systemPrompt }] }
        });
    });
    console.log('[Gemini Stage 1/4] API response received in', Date.now() - stageStart, 'ms');

    const responseText = stripMarkdownCodeBlock(extractGeminiText(response));
    console.log('[Gemini Word Selection] output_text:', responseText.slice(0, 200));

    if (!responseText) throw new Error('Gemini returned empty word selection');

    let rawParsed: unknown;
    try {
        rawParsed = JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse word selection JSON: ${e}\nRaw: ${responseText.slice(0, 500)}`);
    }
    rawParsed = normalizeWordSelectionPayload(rawParsed);

    const wordSelectionParsed = wordSelectionSchema.safeParse(rawParsed);
    if (!wordSelectionParsed.success) {
        throw new Error(`Invalid word selection JSON: ${wordSelectionParsed.error.message}\nRaw: ${responseText.slice(0, 500)}`);
    }

    const selectedWords = wordSelectionParsed.data.selected_words;
    console.log('[Gemini Word Selection] Extracted words:', selectedWords);

    args.history.push({ role: 'model', parts: [{ text: responseText }] });
    return {
        history: args.history,
        selectedWords,
        usage: response.usageMetadata ?? null
    };
}

// ============================================
// Stage 2: 联网研究
// ============================================

export async function runGeminiResearch(args: {
    client: GeminiClient;
    history: GeminiHistory;
    model: string;
    selectedWords: string[];
    topicPreference: string;
    currentDate: string;
}) {
    console.log('[Gemini Stage 2/4] Research - START', { selectedWords: args.selectedWords });
    const stageStart = Date.now();

    const userPrompt = buildResearchUserPrompt({
        selectedWords: args.selectedWords,
        topicPreference: args.topicPreference,
        currentDate: args.currentDate
    });

    args.history.push({ role: 'user', parts: [{ text: userPrompt }] });

    const response = await safeGeminiCall('GeminiResearch', async () => {
        return args.client.generateContent(args.model, {
            contents: args.history,
            generationConfig: {
                temperature: 1,
                thinkingConfig: {
                    includeThoughts: true,
                    thinkingLevel: geminiThinkingLevel
                }
            },
            tools: [{ googleSearch: {} }],
            systemInstruction: { parts: [{ text: RESEARCH_SYSTEM_INSTRUCTION }] }
        });
    });
    console.log('[Gemini Stage 2/4] API response received in', Date.now() - stageStart, 'ms');

    const researchText = extractGeminiText(response).trim();
    if (!researchText) throw new Error('Gemini returned empty research content');

    const sourceUrls = Array.from(
        new Set([
            ...extractHttpUrlsFromText(researchText),
            ...collectHttpUrlsFromUnknown(response)
        ])
    ).slice(0, SOURCE_URL_LIMIT);

    console.log('[Gemini Research] Found', sourceUrls.length, 'source URLs');

    args.history.push({ role: 'model', parts: [{ text: researchText }] });
    return {
        history: args.history,
        sourceUrls,
        usage: response.usageMetadata ?? null
    };
}

// ============================================
// Stage 3: 草稿生成
// ============================================

export async function runGeminiDraftGeneration(args: {
    client: GeminiClient;
    history: GeminiHistory;
    model: string;
    selectedWords: string[];
    sourceUrls: string[];
    currentDate: string;
    topicPreference: string;
}) {
    console.log('[Gemini Stage 3/4] Draft Generation - START', { sourceUrlCount: args.sourceUrls.length });
    const stageStart = Date.now();

    const userPrompt = buildDraftGenerationUserPrompt({
        selectedWords: args.selectedWords,
        sourceUrls: args.sourceUrls,
        currentDate: args.currentDate,
        topicPreference: args.topicPreference
    });

    args.history.push({ role: 'user', parts: [{ text: userPrompt }] });

    const response = await safeGeminiCall('GeminiDraftGeneration', async () => {
        return args.client.generateContent(args.model, {
            contents: args.history,
            generationConfig: {
                temperature: 1,
                thinkingConfig: {
                    includeThoughts: true,
                    thinkingLevel: geminiThinkingLevel
                }
            },
            systemInstruction: { parts: [{ text: DRAFT_SYSTEM_INSTRUCTION }] }
        });
    });
    console.log('[Gemini Stage 3/4] API response received in', Date.now() - stageStart, 'ms');

    const draftText = extractGeminiText(response).trim();
    if (!draftText) throw new Error('Gemini returned empty draft content');

    args.history.push({ role: 'model', parts: [{ text: draftText }] });
    return {
        history: args.history,
        draftText,
        usage: response.usageMetadata ?? null
    };
}

// ============================================
// Stage 4: JSON 转换
// ============================================

export async function runGeminiJsonConversion(args: {
    client: GeminiClient;
    history: GeminiHistory;
    model: string;
    draftText: string;
    sourceUrls: string[];
    selectedWords: string[];
}): Promise<{ history: GeminiHistory; output: DailyNewsOutput; usage: unknown }> {
    console.log('[Gemini Stage 4/4] JSON Conversion - START', { draftLength: args.draftText.length });
    const stageStart = Date.now();

    const userPrompt = buildJsonConversionUserPrompt({
        draftText: args.draftText,
        sourceUrls: args.sourceUrls,
        selectedWords: args.selectedWords
    });

    args.history.push({ role: 'user', parts: [{ text: userPrompt }] });

    const response = await safeGeminiCall('GeminiJsonConversion', async () => {
        return args.client.generateContent(args.model, {
            contents: args.history,
            generationConfig: {
                temperature: 1,
                responseMimeType: 'application/json',
                thinkingConfig: {
                    includeThoughts: true,
                    thinkingLevel: geminiThinkingLevel
                }
            },
            systemInstruction: { parts: [{ text: JSON_SYSTEM_INSTRUCTION }] }
        });
    });
    console.log('[Gemini Stage 4/4] API response received in', Date.now() - stageStart, 'ms');

    const content = stripMarkdownCodeBlock(extractGeminiText(response));
    if (!content) throw new Error('Gemini returned empty content');

    const parsed: unknown = JSON.parse(content);

    const result = dailyNewsOutputSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error(`Invalid Gemini JSON output: ${result.error.message}`);
    }

    args.history.push({ role: 'model', parts: [{ text: content }] });
    return {
        history: args.history,
        output: result.data,
        usage: response.usageMetadata ?? null
    };
}
