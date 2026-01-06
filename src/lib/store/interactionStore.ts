import { map } from 'nanostores';


export type MemoryData = {
    snippet: string;
    articleTitle: string;
    articleId: string;
    date: string;
    timeAgo: string;
}[] | null;

export type InteractionState = {
    activeWord: string | null;  // currently hovered word (lowercase)
    currentLevel: number;       // current Difficulty Level (1, 2, 3)
    memoryData: MemoryData;     // semantic memory context
    hoveredSentenceIndex: number | null; // synced hover state from audio playlist
}

export const interactionStore = map<InteractionState>({
    activeWord: null,
    currentLevel: 1,
    memoryData: null,
    hoveredSentenceIndex: null
});

// Helper actions
export const setHoveredSentence = (index: number | null) => {
    interactionStore.setKey('hoveredSentenceIndex', index);
};

export const setActiveWord = (word: string | null) => {
    const normalized = word ? word.toLowerCase() : null;

    // Only clear memoryData if we are moving to a NEW different word
    // This allows the "Spirit" to keep its content during the mouse-to-card transition
    if (normalized && normalized !== interactionStore.get().activeWord) {
        interactionStore.setKey('memoryData', null);
    }

    interactionStore.setKey('activeWord', normalized);
};

export const setLevel = (level: number) => {
    interactionStore.setKey('currentLevel', level);
};

export const setMemoryData = (data: MemoryData) => {
    interactionStore.setKey('memoryData', data);
};
