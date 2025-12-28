import { map } from 'nanostores';
import type { WordBoundary } from '../tts/types';

export interface AudioState {
    playlist: string[];      // Array of text paragraphs
    currentIndex: number;    // Current paragraph index
    charIndex: number;       // Current character index within the paragraph
    isPlaying: boolean;
    playbackRate: number;    // 0.75, 1.0, 1.25, 1.5
    // Edge TTS specific
    audioUrl: string | null;
    wordAlignments: WordBoundary[];
    isLoading: boolean;
    voice: string;
}

export const audioState = map<AudioState>({
    playlist: [],
    currentIndex: 0,
    charIndex: -1, // -1 means no word highlighted
    isPlaying: false,
    playbackRate: 1.0,
    audioUrl: null,
    wordAlignments: [],
    isLoading: false,
    voice: 'en-US-GuyNeural'
});

// Actions
export const setVoice = (voice: string) => {
    audioState.setKey('voice', voice);
};

export const setPlaylist = (paragraphs: string[]) => {
    const clean = paragraphs.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    audioState.setKey('playlist', clean);
    audioState.setKey('currentIndex', 0);
    audioState.setKey('isPlaying', false);
    audioState.setKey('charIndex', -1);
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
