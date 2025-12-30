/**
 * LLM 生成阶段函数
 * 
 * 四阶段 CoT 流水线：选词 → 研究 → 草稿 → JSON 转换
 */

import type { DailyNewsOutput } from '../../schemas/dailyNews';
import { dailyNewsOutputSchema } from '../../schemas/dailyNews';
import { SOURCE_URL_LIMIT } from './limits';
import {
    appendResponseToHistory,
    collectHttpUrlsFromUnknown,
    extractHttpUrlsFromText,
    normalizeWordSelectionPayload
} from './helpers';
import {
    WORD_SELECTION_SYSTEM_PROMPT,
    buildDraftGenerationUserPrompt,
    buildJsonConversionUserPrompt,
    buildResearchUserPrompt,
    buildWordSelectionUserPrompt
} from './prompts';
import { safeLLMCall } from './errors';
import type { CandidateWord, ConversationHistory, OpenAiClient } from './types';
import { wordSelectionSchema } from './types';

// xhigh medium low auto
export const reasoningEffort = "xhigh";

// ============================================
// Stage 1: 选词
// ============================================

export async function runWordSelection(args: {
    client: OpenAiClient;
    history: ConversationHistory;
    model: string;
    candidateWords: CandidateWord[];
    topicPreference: string;
    currentDate: string;
}) {
    console.log('[LLM Stage 1/4] Word Selection - START', { candidateCount: args.candidateWords.length, model: args.model });
    const stageStart = Date.now();

    const candidateWordsJson = JSON.stringify(args.candidateWords, null, 2);

    args.history.push({
        role: 'system',
        content: WORD_SELECTION_SYSTEM_PROMPT
    });
    args.history.push({
        role: 'user',
        content: buildWordSelectionUserPrompt({
            candidateWordsJson,
            topicPreference: args.topicPreference,
            currentDate: args.currentDate
        })
    });

    console.log('[LLM Stage 1/4] Sending API request...');
    const wordSelectionResp = await safeLLMCall('WordSelection', () => args.client.responses.create({
        model: args.model,
        stream: false,
        reasoning: {
            effort: reasoningEffort,
            summary: "detailed"
        },
        text: { format: { type: 'json_object' } },
        input: args.history
    }));
    console.log('[LLM Stage 1/4] API response received in', Date.now() - stageStart, 'ms');

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

    const history = appendResponseToHistory(args.history, wordSelectionResp);
    return {
        history,
        selectedWords,
        usage: wordSelectionResp.usage ?? null
    };
}

// ============================================
// Stage 2: 联网研究
// ============================================

export async function runResearch(args: {
    client: OpenAiClient;
    history: ConversationHistory;
    model: string;
    selectedWords: string[];
    topicPreference: string;
    currentDate: string;
}) {
    console.log('[LLM Stage 2/4] Research - START', { selectedWords: args.selectedWords });
    const stageStart = Date.now();

    args.history.push({
        role: 'user',
        content: buildResearchUserPrompt({
            selectedWords: args.selectedWords,
            topicPreference: args.topicPreference,
            currentDate: args.currentDate
        })
    });

    console.log('[LLM Stage 2/4] Sending web_search API request...');
    const researchResp = await safeLLMCall('Research', () => args.client.responses.create({
        model: args.model,
        stream: false,
        reasoning: {
            effort: reasoningEffort,
            summary: "detailed"
        },
        tools: [
            {
                type: 'web_search',
                user_location: { type: 'approximate', timezone: 'Asia/Shanghai' }
            }
        ],
        tool_choice: 'auto',
        input: args.history,
        include: ['web_search_call.results', 'web_search_call.action.sources']
    }));
    console.log('[LLM Stage 2/4] API response received in', Date.now() - stageStart, 'ms');

    const researchText = researchResp.output_text?.trim() ?? '';
    if (!researchText) throw new Error('LLM returned empty research content');

    const sourceUrls = Array.from(
        new Set([
            ...extractHttpUrlsFromText(researchText),
            ...collectHttpUrlsFromUnknown(researchResp)
        ])
    ).slice(0, SOURCE_URL_LIMIT);

    if (sourceUrls.length === 0) throw new Error('LLM research produced no source URLs');

    const history = appendResponseToHistory(args.history, researchResp);
    return {
        history,
        sourceUrls,
        usage: researchResp.usage ?? null
    };
}

// ============================================
// Stage 3: 草稿生成
// ============================================

export async function runDraftGeneration(args: {
    client: OpenAiClient;
    history: ConversationHistory;
    model: string;
    selectedWords: string[];
    sourceUrls: string[];
    currentDate: string;
    topicPreference: string;
}) {
    console.log('[LLM Stage 3/4] Draft Generation - START', { sourceUrlCount: args.sourceUrls.length });
    const stageStart = Date.now();

    args.history.push({
        role: 'user',
        content: buildDraftGenerationUserPrompt({
            selectedWords: args.selectedWords,
            sourceUrls: args.sourceUrls,
            currentDate: args.currentDate,
            topicPreference: args.topicPreference
        })
    });

    console.log('[LLM Stage 3/4] Sending API request...');
    const draftResp = await safeLLMCall('DraftGeneration', () => args.client.responses.create({
        model: args.model,
        stream: false,
        reasoning: { effort: reasoningEffort },
        input: args.history
    }));
    console.log('[LLM Stage 3/4] API response received in', Date.now() - stageStart, 'ms');

    const draftText = draftResp.output_text?.trim();
    if (!draftText) throw new Error('LLM returned empty draft content');

    const history = appendResponseToHistory(args.history, draftResp);
    return {
        history,
        draftText,
        usage: draftResp.usage ?? null
    };
}

// ============================================
// Stage 4: JSON 转换
// ============================================

export async function runJsonConversion(args: {
    client: OpenAiClient;
    history: ConversationHistory;
    model: string;
    draftText: string;
    sourceUrls: string[];
    selectedWords: string[];
}): Promise<{ history: ConversationHistory; output: DailyNewsOutput; usage: unknown }> {
    console.log('[LLM Stage 4/4] JSON Conversion - START', { draftLength: args.draftText.length });
    const stageStart = Date.now();

    args.history.push({
        role: 'user',
        content: buildJsonConversionUserPrompt({
            draftText: args.draftText,
            sourceUrls: args.sourceUrls,
            selectedWords: args.selectedWords
        })
    });

    console.log('[LLM Stage 4/4] Sending API request...');
    const genResp = await safeLLMCall('JsonConversion', () => args.client.responses.create({
        model: args.model,
        stream: false,
        reasoning: { effort: reasoningEffort },
        text: { format: { type: 'json_object' } },
        input: args.history
    }));
    console.log('[LLM Stage 4/4] API response received in', Date.now() - stageStart, 'ms');

    const content = genResp.output_text;
    if (!content) throw new Error('LLM returned empty content');

    const parsed: unknown = JSON.parse(content);

    const first = dailyNewsOutputSchema.safeParse(parsed);
    if (!first.success) {
        throw new Error(`Invalid LLM JSON output: ${first.error.message}`);
    }
    const history = appendResponseToHistory(args.history, genResp);
    return {
        history,
        output: first.data,
        usage: genResp.usage ?? null
    };
}
