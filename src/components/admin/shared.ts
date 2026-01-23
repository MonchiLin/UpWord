export type TaskRow = {
    id: string;
    taskDate: string;
    type: string;
    triggerSource: 'manual' | 'cron';
    status: string;
    profileId: string;
    profileName?: string;
    articleTitle?: string;
    llm: 'gemini' | 'openai' | 'claude' | null;
    mode: 'rss' | 'impression';
    contextJson: string | null; // Checkpoints
    // result_json: string | null; // Removed
    errorMessage: string | null;
    errorContextJson: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    publishedAt: string | null;
};

import { apiFetch } from '../../lib/api';

/**
 * API 调用（使用 Cookie 鉴权）
 */
export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    return apiFetch<T>(url, init);
}


