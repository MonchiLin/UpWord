import { map } from 'nanostores';

export type InteractionState = {
    activeWord: string | null;  // currently hovered word (lowercase)
    currentLevel: number;       // current Difficulty Level (1, 2, 3)
}

export const interactionStore = map<InteractionState>({
    activeWord: null,
    currentLevel: 1
});

// Helper actions
export const setActiveWord = (word: string | null) => {
    interactionStore.setKey('activeWord', word ? word.toLowerCase() : null);
};

export const setLevel = (level: number) => {
    interactionStore.setKey('currentLevel', level);
};
