
export type TaskRow = {
    id: string;
    taskDate: string;
    type: string;
    triggerSource: string;
    status: string;
    profileId: string;
    profileName: string | null;
    profileTopicPreference: string | null;
    resultJson: string | null;
    errorMessage: string | null;
    errorContextJson: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    publishedAt: string | null;
};

export async function fetchJson(url: string, adminKey: string, init?: RequestInit) {
    const resp = await fetch(url, {
        ...init,
        headers: {
            ...(init?.headers ?? {}),
            'x-admin-key': adminKey
        }
    });
    const text = await resp.text();
    const data = text ? JSON.parse(text) : null;
    if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
    return data;
}

export function formatTime(isoString: string | null) {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleTimeString('en-GB', { hour12: false });
    } catch {
        return '-';
    }
}
