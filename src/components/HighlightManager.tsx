import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { audioState } from '../lib/store/audioStore';
import { tokenizeSentences, findActiveSid } from '../lib/utils/highlighterLogic';
import { setLevel, setActiveWord } from '../lib/store/interactionStore';

interface HighlightManagerProps {
    articleId: string;
    targetWords: string[];
}

export default function HighlightManager({ articleId, targetWords }: HighlightManagerProps) {
    const [currentLevel, setCurrentLevel] = useState(1);
    const playbackActiveSidRef = useRef<number | null>(null);
    const { charIndex, currentIndex, isPlaying } = useStore(audioState);

    // 监听难度切换
    useEffect(() => {
        const handleLevelChange = (e: CustomEvent) => {
            const level = e.detail?.level;
            if (level) {
                console.log('[HighlightManager] Level changed to:', level);
                setCurrentLevel(level);
                setLevel(level); // Sync to store
            }
        };

        window.addEventListener('level-change' as any, handleLevelChange);
        const saved = localStorage.getItem('luma-words_preferred_level');
        if (saved) {
            const l = parseInt(saved) || 1;
            setCurrentLevel(l);
            setLevel(l);
        }

        return () => window.removeEventListener('level-change' as any, handleLevelChange);
    }, []);

    // 监听来自 highlighterLogic 的 hover 事件
    useEffect(() => {
        const handleWordHover = (e: CustomEvent) => {
            setActiveWord(e.detail?.word || null);
        };
        window.addEventListener('word-hover' as any, handleWordHover);
        return () => window.removeEventListener('word-hover' as any, handleWordHover);
    }, []);

    // 句子分词核心逻辑 (调用抽离后的工具函数)
    useEffect(() => {
        const levelContainer = document.querySelector(`.article-level[data-level="${currentLevel}"]`) as HTMLElement;
        if (!levelContainer || levelContainer.dataset.processed === 'true') return;

        console.log(`[HighlightManager] Initializing tokenization for Level ${currentLevel}`);
        tokenizeSentences(levelContainer, targetWords);
    }, [targetWords, articleId, currentLevel]);

    // 朗读高亮同步 (调用抽离后的工具函数)
    useEffect(() => {
        // 清除旧高亮
        if (playbackActiveSidRef.current !== null) {
            const oldSid = playbackActiveSidRef.current;
            const levelContainer = document.querySelector(`.article-level[data-level="${currentLevel}"]`);
            if (levelContainer) {
                const oldTokens = levelContainer.querySelectorAll(`.s-token[data-sid="${oldSid}"]`);
                oldTokens.forEach(t => t.classList.remove('audio-active-sentence'));
            }
            playbackActiveSidRef.current = null;
        }

        if (!isPlaying || charIndex === -1) return;

        const levelContainer = document.querySelector(`.article-level[data-level="${currentLevel}"]`);
        if (!levelContainer) return;

        const blocks = Array.from(levelContainer.children).filter(el =>
            ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI', 'BLOCKQUOTE', 'DIV'].includes(el.tagName)
        );
        const block = blocks[currentIndex] as HTMLElement;
        if (!block) return;

        // 查找当前应激活的句子 ID
        const targetSid = findActiveSid(block, charIndex);

        if (targetSid !== -1) {
            const targetTokens = block.querySelectorAll(`.s-token[data-sid="${targetSid}"]`);
            targetTokens.forEach(t => t.classList.add('audio-active-sentence'));
            playbackActiveSidRef.current = targetSid;
        }

    }, [charIndex, currentIndex, isPlaying, currentLevel]);

    return null;
}
