import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { interactionStore } from '../lib/store/interactionStore';

interface Point {
    x: number;
    y: number;
}

interface TetherPath {
    path: string;
    opacity: number;
}

export default function VisualTether() {
    const { activeWord, currentLevel } = useStore(interactionStore);
    const [paths, setPaths] = useState<TetherPath[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!activeWord) {
            setPaths([]);
            return;
        }

        const updateTether = () => {
            // 1. Find the Sidebar Card (Target)
            const card = document.querySelector(`[data-word-card="${activeWord}"]`);
            if (!card) return;

            // 2. Find ALL Word Instances in the Current Level (Source)
            // Note: We only look in the active level container to avoid hidden words
            const levelContainer = document.querySelector(`.article-level[data-level="${currentLevel}"]`);
            if (!levelContainer) return;

            const wordInstances = Array.from(levelContainer.querySelectorAll(`.target-word[data-word="${activeWord}"]`));
            if (wordInstances.length === 0) return;

            const cardRect = card.getBoundingClientRect();
            const cardPoint: Point = {
                x: cardRect.left, // Sidebar Left Edge
                y: cardRect.top + cardRect.height / 2
            };

            const newPaths: TetherPath[] = [];

            // 3. Draw a line for EACH instance ("Spider Web" mode)
            wordInstances.forEach((el) => {
                const rect = el.getBoundingClientRect();

                // Check visibility: Simple viewport check
                // We typically only want to tether to words currently on string or close to it
                const isVisible = (
                    rect.top >= -100 &&
                    rect.bottom <= (window.innerHeight + 100)
                );

                if (isVisible) {
                    const wordPoint: Point = {
                        x: rect.right, // Word Right Edge
                        y: rect.top + rect.height / 2
                    };

                    // Convert to SVG coordinates (relative to viewport)
                    // Since SVG is fixed/absolute over the viewport, client coordinates are fine directly
                    // provided the SVG is fixed and full screen.

                    // Bezier Logic
                    const dx = cardPoint.x - wordPoint.x;
                    const cp1 = { x: wordPoint.x + dx * 0.4, y: wordPoint.y };
                    const cp2 = { x: cardPoint.x - dx * 0.4, y: cardPoint.y };

                    const d = `M ${wordPoint.x} ${wordPoint.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${cardPoint.x} ${cardPoint.y}`;

                    newPaths.push({
                        path: d,
                        opacity: 1 // We can fade distance ones if we want later
                    });
                }
            });

            setPaths(newPaths);
        };

        // Initial draw
        updateTether();

        // Follow scrolling
        const handleScroll = () => requestAnimationFrame(updateTether);
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [activeWord, currentLevel]);

    if (paths.length === 0) return null;

    return (
        <svg
            ref={svgRef}
            className="fixed inset-0 pointer-events-none z-50 overflow-visible"
            style={{ width: '100vw', height: '100vh' }}
        >
            <defs>
                <linearGradient id="tetherGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D9480F" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#D9480F" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {paths.map((p, i) => (
                <path
                    key={i}
                    d={p.path}
                    stroke="url(#tetherGradient)"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    filter="url(#glow)"
                    className="transition-all duration-300"
                    style={{ opacity: p.opacity }}
                />
            ))}
        </svg>
    );
}
