import { map } from 'nanostores';

export interface WordBoundary {
    audioOffset: number; // milliseconds
    duration: number;
    text: string;
    textOffset: number;
    wordLength: number;
}

export interface AudioState {
    playlist: string[];      // Array of text paragraphs
    currentIndex: number;    // Current paragraph index
    charIndex: number;       // Current character index within the paragraph
    isPlaying: boolean;
    playbackRate: number;    // 0.75, 1.0, 1.25, 1.5
    isSupported: boolean;    // Web Speech API support
    // Edge TTS specific
    audioUrl: string | null;
    wordAlignments: WordBoundary[];
    isLoading: boolean;
}

export const audioState = map<AudioState>({
    playlist: [],
    currentIndex: 0,
    charIndex: 0,
    isPlaying: false,
    playbackRate: 1.0,
    isSupported: true, // Audio element is universally supported
    audioUrl: null,
    wordAlignments: [],
    isLoading: false
});

// Actions
export const setPlaylist = (paragraphs: string[]) => {
    // Reset state when new content loads
    // Clean text: remove newlines that might break basic TTS flow
    const clean = paragraphs.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    audioState.setKey('playlist', clean);
    audioState.setKey('currentIndex', 0);
    audioState.setKey('isPlaying', false);

    // Cancel any ongoing speech
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};

export const playParagraph = (index: number) => {
    const s = audioState.get();
    if (index >= 0 && index < s.playlist.length) {
        audioState.setKey('currentIndex', index);
        audioState.setKey('isPlaying', true);
    }
};

export const setPlaybackRate = (rate: number) => {
    audioState.setKey('playbackRate', rate);
};

export const togglePlay = () => {
    const s = audioState.get();
    audioState.setKey('isPlaying', !s.isPlaying);
};
