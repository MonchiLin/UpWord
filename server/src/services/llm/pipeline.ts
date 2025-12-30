/**
 * LLM 生成主流程
 * 
 * 多阶段 CoT 文章生成入口
 */

import type { DailyNewsOutput } from '../../schemas/dailyNews';
import { createOpenAiCompatibleClient, type OpenAiCompatibleEnv } from './client';
import { normalizeDailyNewsOutput } from './helpers';
import { runDraftGeneration, runJsonConversion, runResearch, runWordSelection } from './stages';
import type { CandidateWord, ConversationHistory, GenerationCheckpoint } from './types';

export async function generateDailyNewsWithWordSelection(args: {
    env: OpenAiCompatibleEnv;
    model: string;
    currentDate: string;
    topicPreference: string;
    candidateWords: CandidateWord[];
    checkpoint?: GenerationCheckpoint | null;
    onCheckpoint?: (checkpoint: GenerationCheckpoint) => Promise<void>;
}): Promise<{ output: DailyNewsOutput; selectedWords: string[]; usage: unknown }> {
    const client = createOpenAiCompatibleClient(args.env);

    let history: ConversationHistory = args.checkpoint?.history || [];
    let selectedWords = args.checkpoint?.selectedWords || [];
    let sourceUrls = args.checkpoint?.sourceUrls || [];
    let draftText = args.checkpoint?.draftText || '';
    let usage: any = args.checkpoint?.usage || {};

    const currentStage = args.checkpoint?.stage || 'start';

    // Stage 1: Word Selection
    if (currentStage === 'start') {
        const res = await runWordSelection({
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
        const res = await runResearch({
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
        const res = await runDraftGeneration({
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
    const generation = await runJsonConversion({
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
