import { CaretRightFilled, PauseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';
import { audioState, setPlaybackRate, togglePlay } from '../lib/store/audioStore';
import { EdgeTTSClient } from '../lib/tts/edge-client';

// Mock waveform bars
const BARS = Array.from({ length: 24 }, (_, i) => i);

export default function AudioPlayer() {
    const state = useStore(audioState);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const clientRef = useRef<EdgeTTSClient>(new EdgeTTSClient()); // Using default 'en-US-GuyNeural'

    // Destructure for specific dependency tracking
    const { isPlaying, currentIndex, playlist, playbackRate, wordAlignments, isLoading } = state;
    const currentText = playlist[currentIndex];

    // Effect: Fetch audio when index/text changes
    useEffect(() => {
        if (!currentText) return;

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
    }, [currentIndex, currentText, playbackRate]); // Re-fetch on speed change too to burn-in speed? Or use HTML5 rate?
    // Edge TTS supports burning rate into audio. But HTML5 playbackRate is instant.
    // Let's rely on HTML5 rate for speed changes to avoid re-fetching! 
    // Wait, the client synth method accepted rate. 
    // IF we re-fetch on rate change, it's smoother quality but slower.
    // IF we use audio.playbackRate, it's instant but pitch might shift (though browsers are good now).
    // Let's try to remove playbackRate from dependency and use audio element rate.

    // Update: Removed playbackRate from effect dependency.

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

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex justify-between">
                <span>Audio (Edge Neural)</span>
                {isLoading && <span className="text-orange-400 animate-pulse">Loading...</span>}
            </div>

            <audio
                ref={audioRef}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
                className="hidden"
            />

            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors shrink-0 disabled:opacity-50"
                >
                    {state.isPlaying ? <PauseOutlined className="text-lg" /> : <CaretRightFilled className="text-lg" />}
                </button>

                {/* Waveform Visualization */}
                <div className="flex-1 h-8 flex items-center justify-center gap-[2px] overflow-hidden px-2">
                    {BARS.map((i) => (
                        <div
                            key={i}
                            className="w-1 bg-orange-200 rounded-full transition-all duration-300"
                            style={{
                                height: state.isPlaying && !isLoading ? `${Math.max(20, Math.random() * 100)}%` : '20%',
                                opacity: state.isPlaying ? 1 : 0.5,
                                animation: state.isPlaying && !isLoading
                                    ? `bounce 0.8s ease-in-out ${i * 0.05}s infinite`
                                    : 'none',
                                // animationDelay moved into animation shorthand to avoid lint/react warning
                            }}
                        />
                    ))}
                    {/* Add styles for animation */}
                    <style>{`
                         @keyframes bounce {
                             0%, 100% { height: 20%; }
                             50% { height: 80%; }
                         }
                     `}</style>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs font-mono text-gray-400 w-12 text-right">
                        {/* Simple progress indicator */}
                        {state.currentIndex + 1} / {state.playlist.length}
                    </div>

                    {/* Speed Toggle */}
                    <button
                        className="h-8 px-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                            const nextIdx = (speeds.indexOf(state.playbackRate) + 1) % speeds.length;
                            setPlaybackRate(speeds[nextIdx]);
                        }}
                    >
                        {state.playbackRate}x
                    </button>

                    <button
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
                        onClick={() => audioState.setKey('currentIndex', 0)}
                        title="Restart"
                    >
                        <ReloadOutlined />
                    </button>
                </div>
            </div>
        </div>
    );
}
