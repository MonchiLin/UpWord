export type GenerationProfile = {
    id: string;
    name: string;
    topicIds?: string[];
    topics?: { id: string; label: string }[];
    createdAt: string;
    updatedAt: string;
};

export type ProfileDraft = {
    id: string | null;
    name: string;
    topicIds: string[];
};

export interface Topic {
    id: string;
    label: string;
    is_active: boolean;
}
