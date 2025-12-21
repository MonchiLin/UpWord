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
        <div className={clsx("max-w-[1000px] mx-auto p-4 bg-white", className)}>
            {/* 难度切换 */}
            <div className="flex gap-2 mb-6">
                {[1, 2, 3].map((l) => {
                    const isActive = level === l;
                    return (
                        <button
                            key={l}
                            onClick={() => onLevelChange?.(l as 1 | 2 | 3)}
                            className={clsx(
                                "h-[34px] px-[9px] text-[16px] cursor-pointer leading-[24px] border-2 transition-all duration-75 uppercase font-medium tracking-wide flex items-center justify-center",
                                isActive
                                    ? "bg-[#1a202c] border-[#1a202c]"
                                    : "bg-white text-[#777777] border-[#e5e5e5] hover:bg-gray-50"
                            )}
                            style={{
                                fontFamily: 'inherit',
                                borderRadius: '6px',
                                color: isActive ? '#ffffff' : '#777777',
                                boxShadow: isActive ? 'none' : '0px 2px 0px 0px #e5e5e5',
                                transform: isActive ? 'translateY(2px)' : 'none'
                            }}
                        >
                            Level {l}
                        </button>
                    );
                })}
            </div>

            {/* 标题区 */}
            <div className="mb-6">
                <h1
                    className="mb-2 font-bold text-[#111111]"
                    style={{ fontSize: '32px', lineHeight: '38.4px' }}
                >
                    {title}
                </h1>

                <div
                    className="flex gap-4 items-center"
                    style={{ fontSize: '13px', lineHeight: '24px', color: '#999999' }}
                >
                    <span>{publishDate}</span>
                    <span>{stats.wordCount} words</span>
                    <span>{stats.readingTime}</span>
                    <span>{stats.readCount} reads</span>
                </div>
            </div>

            {/* 正文区 */}
            <article className="mb-10" ref={contentRef}>
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

    // Visual Style
    const pClassName = clsx(
        "mb-6 text-[#333333] transition-colors duration-300 rounded-lg p-1 -ml-1",
        isAudioActive && "bg-orange-50/50 border-l-4 border-orange-400 pl-3",
    );

    return (
        <p className={pClassName} style={{ fontSize: '18px', lineHeight: '27px' }}>
            {tokens.map((token, i) => {
                const lowerPart = token.text.toLowerCase();
                const isTarget = token.isWord && targetWords.some(w => w.toLowerCase() === lowerPart);

                // Highlight Logic:
                // Check if audioCharIndex falls within this token's range [start, end)
                // This is robust because we use the EXACT same text source as the one sent to TTS.
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
                                fontWeight: 700,
                                borderBottom: '1px dotted #ea580c',
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
