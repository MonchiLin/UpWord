import React, { useMemo } from 'react';
import styles from './Newspaper.module.css';
import { computeSmartLayout } from './layoutEngine';
import type { Article } from './types';

export type { Article };

interface NewspaperProps {
    articles: Article[];
    date?: string;
    issueNumber?: string;
}

// --- Sub-Components for Card Variants ---

import { ArticleCard } from './ArticleCard';

const COL_WIDTH = 20; // px
const GAP = 24; // px
const ROWS = 24;

export const Newspaper: React.FC<NewspaperProps> = ({
    articles,
    date = "Oct 26, 2023",
    issueNumber = "Vol. 1"
}) => {

    // Measured Container Dimensions
    const [containerHeight, setContainerHeight] = React.useState(window.innerHeight);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleResize = () => {
            // Measure the scrollArea height (minus padding if any)
            // Actually, we want to fit *inside* the scroll area.
            if (scrollRef.current) {
                setContainerHeight(scrollRef.current.clientHeight);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial measurement

        // Use ResizeObserver for more robustness
        const ro = new ResizeObserver(() => handleResize());
        if (scrollRef.current) ro.observe(scrollRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            ro.disconnect();
        };
    }, []);

    // DYNAMIC ROW HEIGHT MATH
    // Goal: Fit 24 rows + 23 gaps exactly into `containerHeight`.
    // Formula: H_total = 24*h + 23*GAP + (PaddingTop+Bottom?)
    // Let's assume Padding is handled by the container DIV, so we have `containerHeight` pure content box.
    // Actually `clientHeight` includes padding usually? No. 
    // Wait, `.product-list` padding?
    // Let's deduce padding. `padding: 2rem` in CSS = 32px top + 32px bottom = 64px.
    // Available H = containerHeight - 64.

    // Safety check
    const PADDING_Y = 64;
    const effectiveH = Math.max(600, containerHeight - PADDING_Y); // Min 600 to prevent collapse

    // 24 * h + 23 * 24 = effectiveH
    // 24 * h = effectiveH - 552
    // h = (effectiveH - 552) / 24

    // If screen is small, this might be negative or tiny.
    // e.g. Screen 700px -> 700 - 64 = 636. 636 - 552 = 84 / 24 = 3.5px. Too small!
    // If row height is too small, layout breaks.

    // ADAPTIVE STRATEGY:
    // If screen is short, we CANNOT fit 24 rows gaplessly with 24px gap.
    // We must scale the GAP down too? 
    // Or we must accept scroll? User wanted "Bottom display incomplete" fixed.
    // "Incomplete" usually implies "I want to see it all".
    // Let's Try: SCALABLE GAP?

    // Let's assume target ROW_H = 20px (square).
    // Target Total H = 20*24 + 24*23 = 1032px.
    // If we only have 700px, we are at 70% scale.
    // Let's apply a `scale` transform to the whole grid? 
    // That's the easiest way to ensure "fit" without breaking aspect ratios.
    // But absolute positioning allows us to just computer smaller coordinates.

    // Let's compute a "Scale Factor" `S`.
    // TargetH = 1032. AvailableH = containerHeight - 64.
    // S = AvailableH / TargetH.
    // effectiveRowH = 20 * S
    // effectiveGap = 24 * S
    // effectiveColW = 20 * S (Keep square aspect!)

    const TARGET_H = 1032; // (20*24 + 23*24)
    const scale = Math.min(1, Math.max(0.5, (containerHeight - PADDING_Y) / TARGET_H));
    // Clamp scale: never zoom in > 1, never shrink < 0.5 (allow scroll if super short)

    const scaledRowH = 20 * scale;
    const scaledGap = 24 * scale;
    const scaledColW = 20 * scale;


    // "The Prediction Algorithm" logic
    // We compute the layout ONCE per article set change.
    const layoutItems = useMemo(() => computeSmartLayout(articles), [articles]);


    // Horizontal Scroll with Mouse Wheel
    React.useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY === 0) return;
            // Translate vertical scroll to horizontal
            e.preventDefault();
            el.scrollTo({
                left: el.scrollLeft + e.deltaY,
                behavior: 'auto' // smooth is too slow for wheel
            });
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // Calculate total width based on scaled metrics
    const maxCol = layoutItems.reduce((max, item) => Math.max(max, item.x + item.w), 0);
    const containerWidth = maxCol * (scaledColW + scaledGap);

    return (
        <div className={styles.container}>
            {/* Fixed Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.brand}>Aperture</div>

                <div className={styles.metaBlock}>
                    <span className={styles.date}>{date}</span>
                    <div className={styles.weather}>
                        <span>☁️</span> 62°F Partly Cloudy
                    </div>
                </div>

                {/* Simulated Audio Player from Ref Image */}
                <div className={styles.playerCard}>
                    <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Morning Focus</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>The Daily</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ width: '24px', height: '24px', background: '#000', borderRadius: '50%' }}></div>
                        <div style={{ height: '4px', background: '#ccc', flex: 1, borderRadius: '2px' }}>
                            <div style={{ width: '40%', height: '100%', background: '#000' }}></div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Scrolling Grid */}
            <div className={styles.scrollArea} ref={scrollRef}>
                <div className={styles.gridContainer} style={{ width: `${containerWidth}px` }}>
                    {layoutItems.map((item) => {
                        // MANUAL LAYOUT MATH (Scaled)
                        const left = item.x * (scaledColW + scaledGap);
                        const top = item.y * (scaledRowH + scaledGap);
                        const width = item.w * scaledColW + (item.w - 1) * scaledGap;
                        const height = item.h * scaledRowH + (item.h - 1) * scaledGap;

                        if (!item.article) return null;

                        return (
                            <ArticleCard
                                key={item.id}
                                article={item.article}
                                variant={item.variant || 'standard'}
                                stylePreset={item.stylePreset}
                                h={item.h}
                                w={item.w}
                                style={{
                                    position: 'absolute',
                                    left: `${left}px`,
                                    top: `${top}px`,
                                    width: `${width}px`,
                                    height: `${height}px`
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
