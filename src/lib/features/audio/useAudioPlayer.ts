import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { audioState, setPlaybackRate, setVoice, togglePlay as storeTogglePlay } from '../../store/audioStore';
import { getCachedAudio, getSentenceAudioOffset, getSentenceIndexAtTime, setPreloaderVoice } from './audioPreloader';

const SPEEDS = [0.85, 0.9, 0.95, 1];
const VOICE_STORAGE_KEY = 'upword_voice_preference';
const RATE_STORAGE_KEY = 'upword_playback_rate';

/**
 * Audio Player Engine Hook (音频播放引擎钩子)
 * 
 * 架构核心：Time-Sentence Synchronization (时间-句子同步机制)
 * 
 * 挑战：
 * 浏览器原生 `<audio>` 播放是基于连续的时间 (Time-Based)，而我们的阅读体验是基于离散的句子单元 (Index-Based)。
 * 这是一个典型的 "Continuous to Discrete" 映射问题。
 * 
 * 解决方案：
 * 1. 单向数据流: Audio Time -> Sentence Index。使用 `getSentenceIndexAtTime` 实时计算当前高亮的句子。
 * 2. 双向交互处理: 
 *    - 自然播放时：Time 驱动 Index 更新。
 *    - 用户点击句子时 (`jumpToSentence`)：Index 驱动 Time 更新 (Seek)。
 *    - 为了防止冲突，引入 `userSeekRef` 标志位，在用户 Seek 期间暂时屏蔽 Time 的自动更新。
 * 
 * 依赖：
 * 使用 `audioPreloader` 提供的预加载和缓存能力，确保音频资源立即可用。
 */
export function useAudioPlayer() {
    const state = useStore(audioState);
    const { isPlaying, currentIndex, playlist, playbackRate, isReady, voice } = state;

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastSentenceIndexRef = useRef<number>(-1);

    // Flag to track if seek was triggered by user action
    const userSeekRef = useRef<boolean>(false);

    // 1. Initialize voice & speed from storage
    useEffect(() => {
        try {
            const savedVoice = localStorage.getItem(VOICE_STORAGE_KEY);
            if (savedVoice) {
                setVoice(savedVoice);
                setPreloaderVoice(savedVoice);
            }

            const savedRate = localStorage.getItem(RATE_STORAGE_KEY);
            if (savedRate) {
                const rate = parseFloat(savedRate);
                if (SPEEDS.includes(rate)) {
                    setPlaybackRate(rate);
                }
            }
        } catch { /* ignore */ }
    }, []);

    // 2. Update preloader voice when it changes
    useEffect(() => {
        setPreloaderVoice(voice);
    }, [voice]);

    // 3. Sync audio source from preloaded cache
    useEffect(() => {
        const audio = audioRef.current;
        const cached = getCachedAudio();

        if (!audio || !cached || !isReady) return;

        if (audio.src !== cached.url) {
            audio.src = cached.url;
            console.log('[useAudioPlayer] Audio source set from cache');
        }
    }, [isReady]);

    // 4. Control playback state
    useEffect(() => {
        const audio = audioRef.current;
        const cached = getCachedAudio();

        if (!audio || !cached || !isReady) return;

        if (isPlaying) {
            audio.play().catch(e => {
                console.warn('Autoplay blocked or failed', e);
                audioState.setKey('isPlaying', false);
            });
        } else {
            audio.pause();
        }

        audio.playbackRate = playbackRate;
    }, [isPlaying, isReady, playbackRate]);

    // 6. Time update handler - update sentence index based on audio time
    const onTimeUpdate = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const currentTime = audio.currentTime;
        const sentenceIdx = getSentenceIndexAtTime(currentTime);

        // Only update if changed and not during user seek
        if (sentenceIdx !== lastSentenceIndexRef.current && !userSeekRef.current) {
            lastSentenceIndexRef.current = sentenceIdx;
            audioState.setKey('currentIndex', sentenceIdx);
            // Sync is now handled by interaction.ts subscribing to audioStore
        }
    }, []);

    // 7. Handle audio end
    const onEnded = useCallback(() => {
        audioState.setKey('isPlaying', false);
        audioState.setKey('currentIndex', 0);
        lastSentenceIndexRef.current = -1;
        // Sync is handled by store subscription
    }, []);

    // 8. Action wrappers
    const togglePlay = useCallback(() => storeTogglePlay(), []);

    const nextSpeed = useCallback(() => {
        const nextIdx = (SPEEDS.indexOf(playbackRate) + 1) % SPEEDS.length;
        const newRate = SPEEDS[nextIdx];
        setPlaybackRate(newRate);
        localStorage.setItem(RATE_STORAGE_KEY, newRate.toString());
    }, [playbackRate]);

    const changeSpeed = useCallback((speed: number) => {
        setPlaybackRate(speed);
        localStorage.setItem(RATE_STORAGE_KEY, speed.toString());
    }, []);

    const restart = useCallback(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.currentTime = 0;
        }
        audioState.setKey('currentIndex', 0);
        audioState.setKey('isPlaying', false);
        lastSentenceIndexRef.current = -1;
    }, []);

    // 9. Jump to specific sentence (USER action - IMPERATIVE seek)
    const jumpToSentence = useCallback((index: number) => {
        const s = audioState.get();
        if (index >= 0 && index < s.playlist.length && audioRef.current && s.isReady) {

            // 1. Guard against time updates fighting us
            userSeekRef.current = true;
            lastSentenceIndexRef.current = index;

            // 2. Perform the seek immediately
            const offset = getSentenceAudioOffset(index);
            audioRef.current.currentTime = offset;
            console.log('[useAudioPlayer] User jumped to sentence', index, 'at', offset.toFixed(2), 's');

            // 3. Update UI state
            audioState.setKey('currentIndex', index);
            audioState.setKey('isPlaying', true);

            // 4. Reset guard
            userSeekRef.current = false;
        }
    }, []);

    return {
        state,
        audioRef,
        onTimeUpdate,
        onEnded,
        togglePlay,
        nextSpeed,
        changeSpeed,
        restart,
        jumpToSentence
    };
}
