import { useEffect, useState } from 'react';
import { setPlaylist } from '../lib/store/audioStore';

interface AudioInitProps {
    allContent: { level: number, content: string }[];
}

/**
 * 音频初始化组件
 * 监听难度切换并将当前难度的文章内容分割为播放列表同步至全局 Store
 */
export default function AudioInit({ allContent }: AudioInitProps) {
    // 默认 Level 1 (从 LocalStorage 同步读取以避免 Flash)
    const [currentLevel, setCurrentLevel] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('aperture-daily_preferred_level');
                return parseInt(saved || '1') || 1;
            } catch {
                return 1;
            }
        }
        return 1;
    });

    // 监听难度切换事件
    useEffect(() => {
        const handleLevelChange = (e: CustomEvent) => {
            const level = e.detail?.level;
            if (level) {
                console.log('[AudioInit] Level changed to:', level);
                setCurrentLevel(level);
            }
        };

        window.addEventListener('level-change' as any, handleLevelChange);

        return () => {
            window.removeEventListener('level-change' as any, handleLevelChange);
        };
    }, []);

    // 当 Level 变化或 content 变化时，更新播放列表
    useEffect(() => {
        if (!allContent || allContent.length === 0) return;

        const targetData = allContent.find(c => c.level === currentLevel) || allContent[0];
        const rawText = targetData.content;

        console.log(`[AudioInit] Generating playlist for Level ${currentLevel}`);

        // 1. Split into paragraphs
        const paragraphs = rawText
            .split('\n')
            .map(p => p.trim())
            .filter(Boolean);

        // 2. Split paragraphs into sentences and flatten using Intl.Segmenter (Consistent with highlighterLogic)
        const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

        const segments: { text: string, isNewParagraph: boolean }[] = [];

        paragraphs.forEach(para => {
            const rawSentences = Array.from(segmenter.segment(para));

            if (rawSentences.length === 0) return;

            rawSentences.forEach((s, idx) => {
                segments.push({
                    text: s.segment,
                    isNewParagraph: idx === 0 // First sentence of a paragraph
                });
            });
        });

        console.log('[AudioInit] Generated segments:', segments.length);

        // 初始化 playlist
        setPlaylist(segments);
    }, [allContent, currentLevel]);

    return null;
}
