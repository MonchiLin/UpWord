export type TaskRow = {
    id: string;
    task_date: string;
    type: string;
    trigger_source: string;
    status: string;
    profile_id: string;
    profileName?: string;
    result_json: string | null;
    error_message: string | null;
    error_context_json: string | null;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
    published_at: string | null;
};

import { apiFetch } from '../../lib/api';

/**
 * 带 admin key 的 API 调用（复用 apiFetch）
 */
export async function fetchJson<T = unknown>(url: string, adminKey: string, init?: RequestInit): Promise<T> {
    return apiFetch<T>(url, {
        ...init,
        token: adminKey
    });
}

import dayjs from 'dayjs';

export function formatTime(iso: string | null | undefined): string {
    if (!iso) return '-';
    try {
        return dayjs(iso).format('HH:mm');
    } catch {
        return iso;
    }
}
