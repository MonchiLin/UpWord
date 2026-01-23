/**
 * [历史回响组件 (HistoricalEchoes.tsx)]
 * ------------------------------------------------------------------
 * 功能：当用户悬停在文章单词上时，渲染穿越时空的上下文 (Contextual Clues)。
 *
 * 核心模式: **Hybrid Architecture (混合架构)**
 * - 监听层: Event Delegation，监听 Store 中的 `activeInteraction` 信号。
 * - 渲染层: React Portal，将 Popover 挂载到 `document.body` 以逃逸 `overflow: hidden` 容器。
 *
 * 关键技术:
 * - Smart Positioning: 利用 Floating UI 的 `flip` 和 `shift` 中间件，实现 Popover 的"智能避障"。
 * - Virtual Element: 因为 Trigger (单词) 在另一个组件树中，我们构造假的 DOMRect (Virtual Reference) 来告诉 Floating UI 它的位置。
 */
import { useEffect, useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react-dom';
import {
    interactionStore,
    activeInteraction,
    popoverHoverState
} from '../lib/store/interactionStore';
import { useArticleMetadata } from '../lib/hooks/useArticleMetadata';
import { PopoverContent } from './echoes';
import type { EchoItemType } from './echoes';

// --- Main Component ---

interface HistoricalEchoesProps {
    showDefinition?: boolean;
    articleId?: string;
}

export default function HistoricalEchoes({ showDefinition = false, articleId }: HistoricalEchoesProps) {
    // 0. Debug Logging (Silent)
    useArticleMetadata(articleId);

    // 1. Subscribe to Store (Source of Truth)
    const interaction = useStore(activeInteraction);
    const { echoData, definition } = useStore(interactionStore);

    // 2. Client-side only
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);

    // 3. Virtual reference element for Floating UI
    const virtualRef = useRef<{
        getBoundingClientRect: () => DOMRect;
    } | null>(null);

    // 4. Floating UI setup with auto-positioning
    const { refs, floatingStyles } = useFloating({
        placement: 'bottom',
        middleware: [
            offset(8),              // 8px gap between word and popover
            flip({ padding: 16 }),  // Flip to top if not enough space below
            shift({ padding: 16 })  // Keep within viewport horizontally
        ],
        whileElementsMounted: autoUpdate,  // Auto-update on scroll/resize
    });

    /**
     * [Virtual Reference Strategy]
     * 意图：解耦 Trigger (单词) 与 Content (浮层)。
     * 痛点：单词由 Astro/React 渲染在深层 DOM，无法直接传递 Ref 给同级的 Popover。
     * 方案：监听 Store 里的坐标 (Rect)，动态生成一个 "Phantom Element" (幽灵元素)。
     *      Floating UI 以为它在跟随一个真实元素，实际上是在跟随这个坐标数据。
     */
    useEffect(() => {
        const rect = interaction?.current?.rect;
        if (rect) {
            virtualRef.current = {
                getBoundingClientRect: () => new DOMRect(rect.left, rect.top, rect.width, rect.height)
            };
            refs.setReference(virtualRef.current);
        }
    }, [interaction?.current?.rect, refs]);

    if (!isClient) return null;

    // 6. Convert echoData to typed array
    const echoes: EchoItemType[] = echoData?.map(e => ({
        snippet: e.snippet,
        articleTitle: e.articleTitle,
        articleId: e.articleId,
        articleSlug: undefined,
        date: e.date,
        timeAgo: e.timeAgo,
    })) ?? [];

    // 7. Check if we have valid data in the store
    const hasEchoes = echoes.length > 0;
    const hasDefinition = showDefinition && !!definition;
    const isActive = !!interaction?.current && (hasEchoes || hasDefinition);

    // 8. Event handlers using nanostores
    const handleMouseEnter = () => popoverHoverState.set(true);
    const handleMouseLeave = () => popoverHoverState.set(false);

    // 9. Render Portal with AnimatePresence for exit animations
    return createPortal(
        <AnimatePresence>
            {isActive && (
                <div
                    key="historical-echoes-popover"
                    ref={refs.setFloating}
                    style={{
                        ...floatingStyles,
                        zIndex: 9999,
                        pointerEvents: 'auto',
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="pt-2"
                >
                    <PopoverContent
                        definition={definition}
                        echoes={echoes}
                        showDefinition={showDefinition}
                    />
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
