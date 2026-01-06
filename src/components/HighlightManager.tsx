import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { audioState } from '../lib/store/audioStore';
import { tokenizeSentences, findActiveSid } from '../lib/utils/highlighterLogic';
import { setMemoryData, interactionStore } from '../lib/store/interactionStore';

interface HighlightManagerProps {
    articleId: string;
    targetWords: string[]; // Keep for backward compatibility or simple highlighting
    wordMatchConfigs?: { lemma: string; forms: string[] }[]; // [Refactor] New Config
    memoriesMap?: Record<string, any>;
}

export default function HighlightManager({ articleId, targetWords, wordMatchConfigs, memoriesMap = {} }: HighlightManagerProps) {

    const wordsWithHistory = Object.keys(memoriesMap);
    const { activeWord, currentLevel } = useStore(interactionStore);
    const playbackActiveSidRef = useRef<number | null>(null);
    const { charIndex, currentIndex, isPlaying } = useStore(audioState);

    // Level change listener removed (reactive via store)

    // Word hover listener removed (logic moved to highlighterLogic calling store directly)

    // [New] Store Sync: Lookup memory for active word
    useEffect(() => {
        if (!activeWord) return;

        const normalized = activeWord.toLowerCase();
        const mems = memoriesMap[normalized];

        console.log(`[HighlightManager] Hover: ${normalized}, History found:`, !!mems);

        if (mems && Array.isArray(mems)) {
            setMemoryData(mems.map(m => ({
                snippet: m.snippet,
                articleTitle: m.articleTitle,
                articleId: m.articleId,
                date: m.date,
                timeAgo: m.timeAgo || m.date
            })));
        }
    }, [activeWord, memoriesMap]);

    // 句子分词核心逻辑 (调用抽离后的工具函数)
    useEffect(() => {
        const levelContainer = document.querySelector(`.article-level[data-level="${currentLevel}"]`) as HTMLElement;
        if (!levelContainer || levelContainer.dataset.processed === 'true') return;

        console.log(`[HighlightManager] Initializing tokenization for Level ${currentLevel}`);
        tokenizeSentences(levelContainer, targetWords, wordsWithHistory, wordMatchConfigs);
    }, [targetWords, articleId, currentLevel, wordsWithHistory, wordMatchConfigs]);

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
