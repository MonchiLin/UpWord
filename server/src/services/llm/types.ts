/**
 * LLM 模块共享类型
 */

import { z } from 'zod';
import { createOpenAiCompatibleClient } from './client';
import { WORD_SELECTION_MAX_WORDS, WORD_SELECTION_MIN_WORDS } from './limits';

// ============================================
// 候选词类型
// ============================================

export type CandidateWord = {
    word: string;
    type: 'new' | 'review';
};

// ============================================
// 客户端和对话类型
// ============================================

export type OpenAiClient = ReturnType<typeof createOpenAiCompatibleClient>;
export type ConversationHistory = any[];

// ============================================
// 选词 Schema
// ============================================

export const wordSelectionSchema = z.object({
    selected_words: z.array(z.string()).min(WORD_SELECTION_MIN_WORDS).max(WORD_SELECTION_MAX_WORDS),
    selection_reasoning: z.string().optional()
});

// ============================================
// Checkpoint 类型
// ============================================

export type GenerationCheckpoint = {
    stage: 'word_selection' | 'research' | 'draft' | 'conversion';
    history: ConversationHistory;
    selectedWords?: string[];
    sourceUrls?: string[];
    draftText?: string;
    usage?: Record<string, any>;
};
