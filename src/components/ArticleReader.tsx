import React from 'react';
// import { theme, ConfigProvider } from 'antd';
import clsx from 'clsx';

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
    return (
        <div className={clsx("max-w-[800px] mx-auto p-4 bg-white", className)}>
            {/* Level Selector */}
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
                                // Force white text color for active state to fix contrast issue
                                color: isActive ? '#ffffff' : '#777777',
                                // Active removes shadow and moves down to look pressed
                                boxShadow: isActive ? 'none' : '0px 2px 0px 0px #e5e5e5',
                                transform: isActive ? 'translateY(2px)' : 'none'
                            }}
                        >
                            Level {l}
                        </button>
                    );
                })}
            </div>

            {/* Header */}
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

            {/* Article Body */}
            {/* The ref attaches here for web-highlighter compatibility if needed on a wrapper, or the article itself */}
            <article className="mb-10" ref={contentRef}>
                {content.map((paragraph, idx) => (
                    <p
                        key={idx}
                        className="mb-6 text-[#333333]"
                        style={{ fontSize: '18px', lineHeight: '27px' }}
                    >
                        {paragraph.split(/\b/).map((part, i) => {
                            // Simple split might separate punctuation, but let's do safe check
                            const isTarget = targetWords.some(w => w.toLowerCase() === part.toLowerCase());
                            if (isTarget) {
                                return (
                                    <span
                                        key={i}
                                        style={{
                                            color: '#ea580c',
                                            fontWeight: 700,
                                            borderBottom: '1px dotted #ea580c',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {part}
                                    </span>
                                );
                            }
                            return part;
                        })}
                    </p>
                ))}
            </article>
        </div>
    );
};
