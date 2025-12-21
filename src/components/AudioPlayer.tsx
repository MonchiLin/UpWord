import { CaretRightFilled, PauseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';
import { audioState, setPlaybackRate, togglePlay, setVoice } from '../lib/store/audioStore';
import { EdgeTTSClient } from '../lib/tts/edge-client';

// Mock waveform bars
const BARS = Array.from({ length: 24 }, (_, i) => i);

export default function AudioPlayer() {
    const state = useStore(audioState);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const clientRef = useRef<EdgeTTSClient>(new EdgeTTSClient()); // Using default 'en-US-GuyNeural'

    // Load voice preference on mount
    useEffect(() => {
        try {
            const savedVoice = localStorage.getItem('luma-words_voice_preference');
            if (savedVoice) {
                setVoice(savedVoice);
                clientRef.current = new EdgeTTSClient(savedVoice);
            }
        } catch { /* ignore */ }
    }, []);

    // Destructure for specific dependency tracking
    const { isPlaying, currentIndex, playlist, playbackRate, wordAlignments, isLoading, voice } = state;
    const currentText = playlist[currentIndex];

    // Effect: Fetch audio when index/text changes
    useEffect(() => {
        if (!currentText) return;

        // Re-instantiate client if voice changed (reactive)
        if (clientRef.current.voice !== voice) {
            clientRef.current = new EdgeTTSClient(voice);
        }

        let active = true;
        const fetchAudio = async () => {
            audioState.setKey('isLoading', true);
            try {
                const result = await clientRef.current.synthesize(currentText, playbackRate);
                if (active) {
                    const url = URL.createObjectURL(result.audioBlob);
                    audioState.setKey('audioUrl', url);
                    audioState.setKey('wordAlignments', result.wordBoundaries);
                    audioState.setKey('isLoading', false);

                    // Reset char index
                    audioState.setKey('charIndex', 0);
                }
            } catch (e) {
                console.error("Edge TTS Error:", e);
                // Fallback or error state?
                if (active) audioState.setKey('isLoading', false);
            }
        };

        // Cleanup old URL
        if (state.audioUrl) {
            URL.revokeObjectURL(state.audioUrl);
            audioState.setKey('audioUrl', null);
            audioState.setKey('wordAlignments', []);
        }

        fetchAudio();

        return () => {
            active = false;
        };
    }, [currentIndex, currentText, playbackRate, voice]); // Depend on VOICE to refetch when settings change

    // Effect: Handle Playback State on Audio Element
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (state.audioUrl) {
            audio.src = state.audioUrl;
            // When src changes, if we were playing or intended to play, we play
            if (isPlaying) {
                audio.play().catch(e => console.warn("Autoplay prevention", e));
            }
        }
    }, [state.audioUrl]);

    // Effect: Watch isPlaying to toggle
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.play().catch(e => console.error("Play error", e));
        } else {
            audio.pause();
        }
    }, [isPlaying]);

    // Effect: Update Rate
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.playbackRate = playbackRate; // Use Native HTML rate which preserves pitch mostly
        }
    }, [playbackRate]);

    // Time Update Handler for Karaoke Logic
    const onTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio || wordAlignments.length === 0) return;

        const timeMs = audio.currentTime * 1000;

        // Robust Sync: Find the last word that has started (startTime <= currentTime)
        // This handles "silence gaps" and "sampling rate mismatches" much better than strict duration checks.
        // Since wordAlignments is sorted by time:
        let activeWord = null;
        for (let i = wordAlignments.length - 1; i >= 0; i--) {
            if (wordAlignments[i].audioOffset <= timeMs) {
                activeWord = wordAlignments[i];
                break;
            }
        }

        if (activeWord) {
            audioState.setKey('charIndex', activeWord.textOffset);
        }
    };

    const onEnded = () => {
        // Next paragraph
        if (currentIndex < playlist.length - 1) {
            audioState.setKey('currentIndex', currentIndex + 1);
        } else {
            audioState.setKey('isPlaying', false);
            audioState.setKey('currentIndex', 0);
            audioState.setKey('charIndex', 0);
        }
    };

    const speeds = [0.75, 1, 1.25, 1.5];

    if (!state.isSupported || state.playlist.length === 0) return null;


    // ... previous code ...

    if (!state.isSupported || state.playlist.length === 0) return null;

    return (
        <div className="mb-8 font-serif">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b-2 border-slate-900 pb-2">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-900">
                    Audio Edition
                </div>
                <div className="text-xs font-mono text-stone-500">
                    {state.playbackRate}x
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-4">
                {/* Play Button - Minimal Circle */}
                <button
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-900 !text-white hover:bg-slate-700 transition-all shrink-0 disabled:opacity-50"
                >
                    {state.isPlaying ? <PauseOutlined className="text-xl" /> : <CaretRightFilled className="text-xl ml-1" />}
                </button>

                {/* Info Text / Status */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-sm font-bold text-slate-900 leading-none mb-1">
                        {isLoading ? 'Loading Audio...' : (state.isPlaying ? 'Now Playing' : 'Listen to Article')}
                    </div>
                    <div className="text-xs text-stone-500 font-serif italic truncate">
                        Section {state.currentIndex + 1} of {state.playlist.length}
                    </div>
                </div>

                {/* Speed / Reset Actions */}
                <div className="flex gap-1">
                    <button
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-300 text-stone-400 hover:text-slate-900 hover:border-slate-900 transition-all"
                        onClick={() => {
                            const nextIdx = (speeds.indexOf(state.playbackRate) + 1) % speeds.length;
                            setPlaybackRate(speeds[nextIdx]);
                        }}
                        title="Speed"
                    >
                        <span className="text-[10px] font-bold">SPD</span>
                    </button>
                    <button
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-300 text-stone-400 hover:text-slate-900 hover:border-slate-900 transition-all"
                        onClick={() => audioState.setKey('currentIndex', 0)}
                        title="Restart"
                    >
                        <ReloadOutlined className="text-xs" />
                    </button>
                </div>
            </div>

            {/* Waveform - Minimal Line */}
            <div className="h-1 flex items-end justify-center gap-[1px] mt-4 opacity-30">
                {BARS.map((i) => (
                    <div
                        key={i}
                        className="w-1 bg-slate-900 transition-all duration-300"
                        style={{
                            height: state.isPlaying && !isLoading ? `${Math.max(20, Math.random() * 100)}%` : '2px',
                            animation: state.isPlaying && !isLoading
                                ? `bounce 0.8s ease-in-out ${i * 0.05}s infinite`
                                : 'none',
                        }}
                    />
                ))}
                <style>{`
                        @keyframes bounce {
                            0%, 100% { height: 2px; }
                            50% { height: 16px; }
                        }
                    `}</style>
            </div>
            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
                className="hidden"
            />
        </div>
    );
}
