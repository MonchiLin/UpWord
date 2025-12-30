/**
 * Gemini 生成主流程
 * 
 * 多阶段 CoT 文章生成入口（使用 Gemini REST API）
 */

import type { DailyNewsOutput } from '../../schemas/dailyNews';
import { createGeminiClient, type GeminiEnv } from './geminiClient';
import { normalizeDailyNewsOutput } from './helpers';
import {
    runGeminiDraftGeneration,
    runGeminiJsonConversion,
    runGeminiResearch,
    runGeminiWordSelection,
    type GeminiHistory
} from './geminiStages';
import type { CandidateWord } from './types';

// Gemini Checkpoint 类型
export type GeminiCheckpoint = {
    stage: 'word_selection' | 'research' | 'draft' | 'conversion';
    history: GeminiHistory;
    selectedWords?: string[];
    sourceUrls?: string[];
    draftText?: string;
    usage?: Record<string, any>;
};

export async function generateDailyNewsWithGemini(args: {
    env: GeminiEnv;
    model: string;
    currentDate: string;
    topicPreference: string;
    candidateWords: CandidateWord[];
    checkpoint?: GeminiCheckpoint | null;
    onCheckpoint?: (checkpoint: GeminiCheckpoint) => Promise<void>;
}): Promise<{ output: DailyNewsOutput; selectedWords: string[]; usage: unknown }> {
    const client = createGeminiClient(args.env);

    let history: GeminiHistory = args.checkpoint?.history || [];
    let selectedWords = args.checkpoint?.selectedWords || [];
    let sourceUrls = args.checkpoint?.sourceUrls || [];
    let draftText = args.checkpoint?.draftText || '';
    let usage: any = args.checkpoint?.usage || {};

    const currentStage = args.checkpoint?.stage || 'start';

    // Stage 1: Word Selection
    if (currentStage === 'start') {
        const res = await runGeminiWordSelection({
            client,
            history,
            model: args.model,
            candidateWords: args.candidateWords,
            topicPreference: args.topicPreference,
            currentDate: args.currentDate
        });
        history = res.history;
        selectedWords = res.selectedWords;
        usage.word_selection = res.usage;

        if (args.onCheckpoint) {
            await args.onCheckpoint({
                stage: 'word_selection',
                history,
                selectedWords,
                usage
            });
        }
    }

    // Stage 2: Research
    if (currentStage === 'start' || currentStage === 'word_selection') {
        const res = await runGeminiResearch({
            client,
            history,
            model: args.model,
            selectedWords,
            topicPreference: args.topicPreference,
            currentDate: args.currentDate
        });
        history = res.history;
        sourceUrls = res.sourceUrls;
        usage.research = res.usage;

        if (args.onCheckpoint) {
            await args.onCheckpoint({
                stage: 'research',
                history,
                selectedWords,
                sourceUrls,
                usage
            });
        }
    }

    // Stage 3: Draft Generation
    if (currentStage === 'start' || currentStage === 'word_selection' || currentStage === 'research') {
        const res = await runGeminiDraftGeneration({
            client,
            history,
            model: args.model,
            selectedWords,
            sourceUrls,
            currentDate: args.currentDate,
            topicPreference: args.topicPreference
        });
        history = res.history;
        draftText = res.draftText;
        usage.draft = res.usage;

        if (args.onCheckpoint) {
            await args.onCheckpoint({
                stage: 'draft',
                history,
                selectedWords,
                sourceUrls,
                draftText: res.draftText,
                usage
            });
        }
    }

    // Stage 4: Conversion
    const generation = await runGeminiJsonConversion({
        client,
        history,
        model: args.model,
        draftText: typeof draftText === 'string' ? draftText : '',
        sourceUrls,
        selectedWords
    });

    return {
        output: normalizeDailyNewsOutput(generation.output),
        selectedWords,
        usage: {
            ...usage,
            generation: generation.usage ?? null
        }
    };
}
