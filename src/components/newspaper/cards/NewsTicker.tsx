import React from 'react';
import styles from '../Newspaper.module.css';
import type { Article } from '../types';

// ============================================================================
// 1. CARD BRIEF
// ============================================================================
export const CardBrief: React.FC<{ article: Article }> = ({ article }) => {
    return (
        <div style={{
            height: '100%', width: '100%', padding: '1.2rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            background: '#222', color: '#fff',
            borderRadius: 'inherit'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div className={styles.liveIndicator} style={{ marginRight: '8px' }}></div>
                <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    BREAKING
                </span>
            </div>

            <h3 style={{
                fontSize: '1.1rem', lineHeight: 1.4, fontWeight: 500,
                fontFamily: 'DM Sans', margin: 0,
                borderLeft: '2px solid var(--news-red)', paddingLeft: '0.8rem'
            }}>
                {article.headline}
            </h3>

            <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ color: 'var(--news-red)' }}>LIVE UPDATES</span>
            </div>
        </div>
    );
};

// ============================================================================
// 2. CARD DIGEST
// ============================================================================
export const CardDigest: React.FC<{ article: Article }> = ({ article }) => {
    // 1. Split content into sentences/points
    // We assume the content might be a long block. We'll split by periods or newlines.
    // Ideally, for a "Digest", the data content would already be newline separated.
    // Fallback: split by sentences and take top 4.
    const rawPoints = article.content.split(/\.|\n/).filter(s => s.trim().length > 10);
    const points = rawPoints.slice(0, 4);

    return (
        <div style={{
            height: '100%', width: '100%',
            padding: '1.5rem',
            background: '#fffbf0', // Very light cream
            borderTop: '4px solid #000',
            borderBottom: '1px solid #ddd',
            display: 'flex', flexDirection: 'column',
            borderRadius: 'inherit'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                    fontFamily: 'Frank Ruhl Libre, serif',
                    fontSize: '1.8rem',
                    fontWeight: 700,
                    margin: 0,
                    lineHeight: 1.1
                }}>
                    {article.headline}
                </h3>
                <div style={{
                    marginTop: '0.8rem',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#d62828',
                    borderBottom: '1px solid #d62828',
                    display: 'inline-block',
                    paddingBottom: '2px'
                }}>
                    IN BRIEF / TL;DR
                </div>
            </div>

            {/* List */}
            <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                overflow: 'hidden' // Prevent overflow if too many items
            }}>
                {points.map((point, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1.4 }}>
                        <span style={{
                            marginRight: '0.8rem',
                            fontSize: '1.2rem', // Bigger bullet
                            lineHeight: 0,
                            color: '#000'
                        }}>
                            •
                        </span>
                        <span style={{
                            fontSize: '0.95rem',
                            fontFamily: 'DM Sans, sans-serif',
                            color: '#333'
                        }}>
                            {/* Make first few words bold to simulate a "Lead-in" if possible, 
                                but simplistic approach is just render text */}
                            <strong style={{ color: '#000' }}>{point.trim().split(' ').slice(0, 2).join(' ')}</strong>
                            {' ' + point.trim().split(' ').slice(2).join(' ')}.
                        </span>
                    </li>
                ))}
            </ul>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>
                Curated by {article.author || 'The Editors'}
            </div>
        </div>
    );
};

// ============================================================================
// 3. CARD INFOGRAPHIC
// ============================================================================
export const CardInfographic: React.FC<{ article: Article }> = ({ article }) => {
    // Generate a pseudo-random number based on title length
    const percent = 45 + (article.headline.length % 50);

    return (
        <div style={{
            height: '100%', width: '100%', padding: '1.5rem',
            background: '#fff', border: '1px solid #ddd',
            display: 'flex', flexDirection: 'column',
            borderRadius: 'inherit'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Data Insight</span>
                <span style={{ fontSize: '0.7rem', color: '#d62828' }}>LIVE</span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '5rem', lineHeight: 0.8, fontWeight: 700, fontFamily: 'Frank Ruhl Libre, serif', letterSpacing: '-0.05em' }}>
                    {percent}%
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem', fontWeight: 500 }}>
                    GROWTH RATE IN SECTOR
                </div>
            </div>

            {/* Decor Chart Line */}
            <div style={{ height: '2px', width: '100%', background: '#eee', position: 'relative', marginBottom: '1.5rem' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${percent}%`, background: '#d62828' }}></div>
                <div style={{ position: 'absolute', left: `${percent}%`, top: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: '#d62828', border: '2px solid #fff' }}></div>
            </div>

            <h3 style={{ fontSize: '1.1rem', lineHeight: 1.3, fontWeight: 500 }}>
                {article.headline}
            </h3>
        </div>
    );
};
