import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import type { ProfileDraft, Topic } from './types';

interface UseProfileDrawerInput {
    open: boolean;
    mode: 'create' | 'edit';
    initialDraft: ProfileDraft;
    onSuccess: () => void;
    // We don't need onClose in the logic hook unless it orchestrates closing, 
    // but usually the component handles that based on success.
}

export function useProfileDrawerLogic({ open, mode, initialDraft, onSuccess }: UseProfileDrawerInput) {
    const [draft, setDraft] = useState<ProfileDraft>(initialDraft);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);

    // Initial sync
    useEffect(() => {
        if (open) {
            setDraft(initialDraft);
            setError(null);
            fetchTopics();
        }
    }, [open, initialDraft]);

    const fetchTopics = async () => {
        try {
            const res = await apiFetch<Topic[]>('/api/topics');
            if (res) {
                setAvailableTopics(res.filter(t => t.is_active));
            }
        } catch (e) {
            console.error('Failed to fetch topics', e);
        }
    };

    const handleCreateTopic = async () => {
        const name = prompt("Enter new topic name:");
        if (!name) return;
        try {
            const res = await apiFetch<{ id: string }>('/api/topics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: name, prompts: 'General news coverage' })
            });
            await fetchTopics();
            if (res.id) toggleTopic(res.id);
        } catch (e) {
            alert('Failed to create topic');
        }
    };

    const toggleTopic = (topicId: string) => {
        const current = new Set(draft.topicIds || []);
        if (current.has(topicId)) {
            current.delete(topicId);
        } else {
            current.add(topicId);
        }
        setDraft(d => ({ ...d, topicIds: Array.from(current) }));
    };

    const handleSubmit = async () => {
        setError(null);
        const name = draft.name.trim();

        if (!name) {
            setError('Name is required');
            return false;
        }
        if (draft.topicIds.length === 0) {
            setError('Please select at least one topic');
            return false;
        }

        const payload = { ...draft, name };

        setLoading(true);
        try {
            let savedProfileId = draft.id;
            if (mode === 'create') {
                const res = await apiFetch<{ id: string }>('/api/profiles', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                savedProfileId = res.id;
            } else if (draft.id) {
                await apiFetch(`/api/profiles/${encodeURIComponent(draft.id)}`, {
                    method: 'PUT',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            // Update local state to reflect saved status
            if (mode === 'create' && savedProfileId) {
                setDraft(d => ({ ...d, id: savedProfileId }));
            }
            onSuccess();
            return true;
        } catch (e) {
            setError((e as Error).message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        draft,
        setDraft,
        loading,
        error,
        availableTopics,
        handleCreateTopic,
        toggleTopic,
        handleSubmit,
    };
}
