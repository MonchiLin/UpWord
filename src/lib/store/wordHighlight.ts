import { atom } from 'nanostores';

export const highlightedWordId = atom<string | null>(null);

export function setHighlightedWord(word: string) {
    highlightedWordId.set(word);
}
