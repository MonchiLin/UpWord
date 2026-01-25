import React from 'react';
import styles from '../Newspaper.module.css';
import type { Article } from '../types';

// ============================================================================
// 1. CARD INTERVIEW
// ============================================================================
export const CardInterview: React.FC<{ article: Article }> = ({ article }) => {
    return (
        <div style={{
            height: '100%', width: '100%',
            background: '#fff',
            display: 'flex', flexDirection: 'column',
            border: '1px solid #eee',
            borderRadius: 'inherit', overflow: 'hidden'
        }}>
            {/* Header: The "Talk" */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #000',
                backgroundColor: '#f9f9f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div>
                    <span className={styles.tag} style={{ color: '#000', border: '1px solid #000', padding: '2px 8px', borderRadius: '100px' }}>
                        THE CONVERSATION
                    </span>
                    <h3 style={{
                        marginTop: '0.8rem', fontSize: '1.4rem', lineHeight: 1.1,
                        fontFamily: 'Frank Ruhl Libre, serif', fontStyle: 'italic', fontWeight: 500
                    }}>
                        {article.headline}
                    </h3>
                </div>
                {/* Mock Avatar */}
                <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: '#e0e0e0', marginLeft: '1rem', flexShrink: 0,
                    overflow: 'hidden', border: '1px solid #000'
                }}>
                    {article.imageUrl ? (
                        <img src={article.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            {article.author?.[0] || 'G'}
                        </div>
                    )}
                </div>
            </div>

            {/* Body: The Q&A Flow */}
            <div style={{ padding: '1.5rem', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Intro/Context */}
                <div style={{ fontSize: '0.9rem', color: '#666', fontFamily: 'DM Sans', paddingBottom: '1rem', borderBottom: '1px dashed #ccc' }}>
                    {article.subhead || "A discussion on the future of everything and nothing."}
                </div>

                {/* Q1 */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'Frank Ruhl Libre, serif', color: '#000' }}>Q.</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Frank Ruhl Libre, serif', color: '#111', lineHeight: 1.3 }}>
                        What was the turning point in your career that changed your perspective on design?
                    </div>
                </div>

                {/* A1 */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'Frank Ruhl Libre, serif', color: '#666' }}>A.</div>
                    <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#333', fontFamily: 'Georgia, serif' }}>
                        {article.content.substring(0, 180)}...
                        <span style={{ fontWeight: 700, marginLeft: '0.5rem', cursor: 'pointer', textDecoration: 'underline' }}>Read More</span>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '0.8rem 1.5rem', borderTop: '1px solid #eee', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', display: 'flex', justifyContent: 'space-between' }}>
                <span>{article.author}</span>
                <span>4 min read</span>
            </div>
        </div>
    );
};

// ============================================================================
// 2. CARD QUOTE
// ============================================================================
export const CardQuote: React.FC<{ article: Article }> = ({ article }) => {
    // Randomize style slightly for variety, or stick to a strong default
    const isInverted = article.headline.length % 2 === 0;

    return (
        <div style={{
            height: '100%', width: '100%',
            padding: '2rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            background: isInverted ? '#111' : '#f4f1ea',
            color: isInverted ? '#fff' : '#111',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'inherit'
        }}>
            {/* Giant Background Quote Mark */}
            <div style={{
                fontSize: '12rem', lineHeight: 0.5,
                fontFamily: 'Frank Ruhl Libre, serif',
                color: isInverted ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                pointerEvents: 'none'
            }}>
                &ldquo;
            </div>

            <div style={{
                position: 'relative', zIndex: 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem'
            }}>
                <div style={{ width: '40px', height: '2px', background: isInverted ? '#fff' : '#000' }}></div>

                <h2 style={{
                    fontSize: '1.8rem',
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontFamily: 'Frank Ruhl Libre, serif',
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em'
                }}>
                    {article.headline}
                </h2>

                <div style={{
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    fontWeight: 700,
                    color: isInverted ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    fontFamily: 'DM Sans, sans-serif'
                }}>
                    {article.author || 'The Editors'}
                </div>
            </div>

            {/* Corner Year/Date */}
            <div style={{
                position: 'absolute', bottom: '1.5rem', right: '1.5rem',
                fontSize: '0.7rem', fontWeight: 700,
                color: isInverted ? '#333' : '#ddd'
            }}>
                {new Date().getFullYear()}
            </div>
        </div>
    );
};
