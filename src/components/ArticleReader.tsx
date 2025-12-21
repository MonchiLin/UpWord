import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { highlightedWordId, setHighlightedWord } from '../lib/store/wordHighlight';
import { audioState } from '../lib/store/audioStore';

export interface ArticleReaderProps {
    id?: string;
    title: string;
    publishDate: string;
    stats: {
        wordCount: number;
        readingTime: string;
        readCount: number;
    };
    level: 1 | 2 | 3;
    content: string[];
    targetWords?: string[];
    onLevelChange?: (level: 1 | 2 | 3) => void;
    className?: string;
    contentRef?: React.Ref<HTMLElement>;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({
    title,
    publishDate,
    stats,
    level,
    content,
    targetWords = [],
    onLevelChange,
    className,
    contentRef,
}) => {
    const activeId = useStore(highlightedWordId);

    // Auto-scroll logic when highlighted word changes
    useEffect(() => {
        if (!activeId) return;

        // Slight delay to ensure DOM is ready
        const selector = `[data-word="${activeId.toLowerCase()}"]`;
        const element = document.querySelector(selector);

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeId]);

    return (
        <div className={clsx("w-full bg-transparent", className)}>
            {/* 顶部元数据与难度切换区域 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-gray-100">
                {/* 标题与元数据 */}
                <div className="flex-1">
                    <h1
                        className="mb-3 font-bold text-[#111111] tracking-tight"
                        style={{ fontSize: '32px', lineHeight: '1.2' }}
                    >
                        {title}
                    </h1>

                    <div
                        className="flex flex-wrap gap-x-6 gap-y-2 items-center text-sm font-medium text-gray-500"
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            {publishDate}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            {stats.readCount} reads
                        </span>
                    </div>
                </div>

                {/* Segmented Control for Level */}
                <div className="bg-gray-100/80 p-1.5 rounded-xl inline-flex self-start md:self-center shrink-0">
                    {[1, 2, 3].map((l) => {
                        const isActive = level === l;
                        return (
                            <button
                                key={l}
                                onClick={() => onLevelChange?.(l as 1 | 2 | 3)}
                                className={clsx(
                                    "relative px-4 py-1.5 text-sm font-semibold transition-colors duration-200 z-10",
                                    isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="level-indicator"
                                        className="absolute inset-0 bg-white rounded-lg shadow-sm border border-black/5 -z-10"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                Level {l}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 正文区 */}
            <article ref={contentRef}>
                {content.map((text, idx) => (
                    <TokenizedParagraph
                        key={idx}
                        index={idx}
                        text={text}
                        targetWords={targetWords}
                        activeWordId={activeId}
                    />
                ))}
            </article>

            {/* 底部统计 */}
            <div className="mt-12 text-center text-gray-400 text-sm font-medium flex items-center justify-center gap-2">
                <span>{stats.wordCount} words</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span>{stats.readingTime}</span>
            </div>
        </div>
    );
};

// Memoized paragraph component to prevent regex re-computation and ensure stable offsets
const TokenizedParagraph = React.memo(({ index, text, targetWords, activeWordId }: {
    index: number;
    text: string;
    targetWords: string[];
    activeWordId: string | null;
}) => {
    // Audio State
    const audio = useStore(audioState);
    const isPlaying = audio.isPlaying;
    const isAudioActive = isPlaying && audio.currentIndex === index;
    const audioCharIndex = audio.charIndex;

    // Pre-calculate tokens and their offsets once per text change
    // We strictly use regex to find tokens and track their absolute start/end indices
    const tokens = React.useMemo(() => {
        const parts: { text: string; start: number; end: number; isWord: boolean }[] = [];
        let offset = 0;
        // Split by word boundary but keep delimiters. 
        // Note: JS split with capture group includes delimiters.
        const rawParts = text.split(/(\b)/);

        rawParts.forEach(part => {
            if (!part) return;
            const len = part.length;
            // Naive word check: has alphanumeric char
            const isWord = /\w/.test(part);

            parts.push({
                text: part,
                start: offset,
                end: offset + len,
                isWord
            });
            offset += len;
        });
        return parts;
    }, [text]);

    // Visual Style Update: text-[19px], leading-relaxed (1.8), #333 text color
    const pClassName = clsx(
        "mb-7 text-[#333333] transition-colors duration-300 rounded-lg p-1 -ml-1",
        isAudioActive && "bg-orange-50/50 border-l-4 border-orange-400 pl-3",
    );

    return (
        <p className={pClassName} style={{ fontSize: '18px', lineHeight: '1.6' }}>
            {tokens.map((token, i) => {
                const lowerPart = token.text.toLowerCase();
                const isTarget = token.isWord && targetWords.some(w => w.toLowerCase() === lowerPart);

                // Highlight Logic:
                // Check if audioCharIndex falls within token [start, end)
                const isSpeaking = isAudioActive && (audioCharIndex >= token.start && audioCharIndex < token.end);

                if (isSpeaking) {
                    return (
                        <span key={i} className="bg-orange-200 rounded px-0.5 -mx-0.5 transition-colors duration-75 text-gray-900 font-medium">
                            {token.text}
                        </span>
                    );
                }

                if (isTarget) {
                    const isHighlighted = activeWordId?.toLowerCase() === lowerPart;
                    return (
                        <motion.span
                            key={i}
                            data-word={lowerPart}
                            animate={isHighlighted ? {
                                scale: [1, 1.2, 1],
                                backgroundColor: ["rgba(255,255,255,0)", "rgba(234, 88, 12, 0.2)", "rgba(255,255,255,0)"],
                                transition: { duration: 0.6 }
                            } : {}}
                            style={{
                                color: '#ea580c',
                                fontWeight: 600,
                                borderBottom: '2px dotted #ea580c', // Thicker dotted line for better visibility
                                cursor: 'pointer',
                                display: 'inline-block'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setHighlightedWord(token.text);
                            }}
                        >
                            {token.text}
                        </motion.span>
                    );
                }

                return <span key={i}>{token.text}</span>;
            })}
        </p>
    );
});
