import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { VinylRecord } from './VinylRecord';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { AudioPlaylist } from './AudioPlaylist';

// --- Icons (H200 Premium SVGs) ---
const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-stone-900">
        <path d="M8 5v14l11-7z" />
    </svg>
);
const PauseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-stone-900">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);
const MaximizeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
);
const MinimizeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
    </svg>
);

/**
 * H200 FLUID AUDIO PLAYER
 * 
 * A single, unified component that morphs between a 'Mini Pill' and a 'Full Card'.
 * Designed for maximum fluidity and robustness.
 */
const FloatingAudioPlayer: React.FC = () => {
    // UI State: Fluid Mode (false = Mini Pill, true = Full Card)
    const [isExpanded, setIsExpanded] = useState(false);

    // Audio Hook
    const {
        state,
        togglePlay,
        onTimeUpdate,
        onEnded,
        audioRef
    } = useAudioPlayer();

    const { isPlaying, playlist, currentIndex } = state;

    // Progress State
    const [progress, setProgress] = useState(0);

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        onTimeUpdate();
        const audio = e.currentTarget;
        if (playlist.length > 0 && audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
        }
    };

    // Auto-expand if user starts playing from elsewhere (optional, but good UX)
    // useEffect(() => { if (isPlaying) setIsExpanded(true); }, [isPlaying]);

    return (
        <LayoutGroup>
            <div className="fixed bottom-6 right-6 z-50 font-sans">

                {/* Logic Core */}
                <audio
                    ref={audioRef}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={onEnded}
                    className="hidden"
                    crossOrigin="anonymous"
                />

                {/* --- FLUID CONTAINER --- */}
                <motion.div
                    layout
                    data-expanded={isExpanded} // styling hook
                    className={`
                        relative overflow-hidden
                        ${isExpanded
                            ? 'bg-white/95 backdrop-blur-2xl shadow-[0_30px_60px_-10px_rgba(0,0,0,0.12)] rounded-[32px] border border-stone-200/50'
                            : 'bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] rounded-full cursor-pointer hover:scale-105 active:scale-95 border border-stone-100'
                        }
                    `}
                    style={{
                        width: isExpanded ? 640 : 64, // 64px is standard pill size
                        height: isExpanded ? 360 : 64,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 240,
                        damping: 24,
                        mass: 0.8
                    }}
                    onClick={() => !isExpanded && setIsExpanded(true)}
                >
                    {/* --- INNER CONTENT SWITCHER --- */}
                    <AnimatePresence mode="popLayout">

                        {/* 1. MINI PILL STATE */}
                        {!isExpanded && (
                            <motion.div
                                key="mini"
                                className="absolute inset-0 flex items-center justify-center text-stone-900"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* Spinning Vinyl Icon (CSS Animation) */}
                                <div className={`w-8 h-8 rounded-full border border-stone-200 bg-stone-900 relative ${isPlaying ? 'animate-spin-slow' : ''}`}>
                                    <div className="absolute inset-2 bg-stone-800 rounded-full border border-stone-600"></div>
                                    <div className="absolute top-0 left-1/2 w-0.5 h-3 bg-white/20 -translate-x-1/2"></div>
                                </div>
                            </motion.div>
                        )}

                        {/* 2. FULL CARD STATE */}
                        {isExpanded && (
                            <motion.div
                                key="full"
                                className="w-full h-full flex flex-row"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.1, duration: 0.3 }}
                            >
                                {/* --- Left: Interactive Vinyl & Controls --- */}
                                <div className="w-[200px] h-full bg-stone-50/50 flex flex-col items-center justify-between p-6 border-r border-stone-200/60 relative">

                                    {/* Minimize Button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                                        className="absolute top-4 left-4 p-2 text-stone-400 hover:text-stone-900 transition-colors"
                                    >
                                        <MinimizeIcon />
                                    </button>

                                    {/* Vinyl Record */}
                                    <div className="mt-8 relative group">
                                        <VinylRecord isPlaying={isPlaying} rate={state.playbackRate} />

                                        {/* Center Play Button Overlay */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        >
                                            <div className="w-12 h-12 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                            </div>
                                        </button>
                                    </div>

                                    {/* Playback Progress */}
                                    <div className="w-full space-y-2 mb-4">
                                        <div className="flex justify-between text-[10px] text-stone-500 font-mono tracking-wider">
                                            <span>NOW PLAYING</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-stone-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-stone-800 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* --- Right: Transcript & Details --- */}
                                <div className="flex-1 h-full bg-white/40 flex flex-col relative overflow-hidden">
                                    {/* H200 Glass Header */}
                                    <div className="h-14 border-b border-stone-100 flex items-center px-6 justify-between bg-white/50">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-xs font-medium text-stone-500 tracking-widest uppercase">AI Audio Engine</span>
                                        </div>
                                        {/* Speed Control */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); /* logic */ }}
                                            className="text-xs font-bold text-stone-400 hover:text-stone-900 px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 transition-colors"
                                        >
                                            1.0x
                                        </button>
                                    </div>

                                    {/* Scrollable Content */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                                        {playlist.length > 0 ? (
                                            <AudioPlaylist
                                                playlist={playlist}
                                                currentIndex={currentIndex}
                                                isExpanded={isExpanded}
                                                onJump={(idx) => { /* jump logic */ }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 space-y-4">
                                                <div className="w-12 h-12 rounded-full border-2 border-dashed border-stone-200 animate-spin-slow"></div>
                                                <p className="text-sm">Waiting for signal...</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Gradient Overlay for Text Fade */}
                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Styles for slow spin */}
                <style>{`
                    @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    .animate-spin-slow { animation: spin-slow 8s linear infinite; }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
                `}</style>
            </div>
        </LayoutGroup>
    );
};

export default FloatingAudioPlayer;
