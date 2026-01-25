import React from 'react';
import styles from '../Newspaper.module.css';
import type { Article } from '../types';

const formatDate = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ============================================================================
// 1. STANDARD CARD
// ============================================================================
export const CardStandard: React.FC<{ article: Article, w: number, h: number }> = ({ article, w, h }) => {
    const textSize = w >= 18 ? styles['text-l'] : (w <= 11 ? styles['text-s'] : styles['text-m']);

    // Dynamic Image Height: 
    // If h is tall, image is large. If h is short, image takes less space.
    // Base split: 50% image, 50% text.
    // If h < 8 units, reduce image to 40%.
    const imgHeight = h < 8 ? '45%' : '55%';

    // Remaining space for text
    const maxSubheadLines = Math.max(1, Math.floor((h / 2) - 2));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 'inherit' }}>
            {article.imageUrl && (
                <div style={{
                    height: imgHeight, width: '100%', overflow: 'hidden',
                    backgroundColor: '#f0f0f0', flexShrink: 0,
                    borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit'
                }}>
                    <img src={article.imageUrl} className={styles.zoomImage} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
            )}
            <div className={styles.contentWrapper} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.5rem' }}>
                <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                    <span className={styles.tag}>News</span>
                    <div style={{ flex: 1, height: '1px', background: '#eaeaea', marginLeft: '10px' }}></div>
                </div>
                <h2 className={`${styles.headline} ${textSize}`}>{article.headline}</h2>
                {article.subhead && h >= 4 && (
                    <p className={styles.subhead} style={{
                        display: '-webkit-box',
                        WebkitLineClamp: maxSubheadLines,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        marginBottom: 0
                    }}>
                        {article.subhead}
                    </p>
                )}
                <div style={{ marginTop: 'auto', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#999', fontFamily: 'DM Sans', letterSpacing: '0.05em' }}>
                    <span style={{ fontWeight: 700, color: '#000' }}>{article.author?.split(' ')[0] || 'STAFF'}</span>
                    <span>{formatDate()}</span>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 2. TEXT CARD
// ============================================================================
export const CardText: React.FC<{ article: Article, w: number, h: number, stylePreset?: string }> = ({ article, w, h, stylePreset }) => {
    // Large "Feature" Text Card Strategy (Magazine Style)
    // Instead of wall-of-text, show Headline + Pull Quote + Summary
    const isMagazineFeature = h >= 10;

    const textSize = w >= 18 ? styles['text-l'] : (w <= 11 ? styles['text-s'] : styles['text-m']);
    const isCentered = stylePreset === 'serif' || stylePreset === 'inverted';

    if (isMagazineFeature) {
        // Extract a "quote" simulation from the content or use a default
        const quoteText = "The market is correcting itself in ways we didn't foresee, creating new opportunities.";

        return (
            <div className={styles.contentWrapper} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2rem' }}>
                <div>
                    <span className={styles.tag}>OPINION</span>
                    <h2 className={`${styles.headline} ${textSize}`} style={{ fontSize: '2rem', marginBottom: '1rem' }}>{article.headline}</h2>
                </div>

                <div className={styles.pullQuote}>
                    “{quoteText}”
                </div>

                <div>
                    <p className={styles.subhead} style={{ fontSize: '1.1rem', color: '#666', lineHeight: 1.6 }}>
                        {article.subhead || article.content.substring(0, 120) + "..."}
                    </p>
                    <div style={{ marginTop: '1rem', fontWeight: 700, fontSize: '0.9rem', color: '#d62828', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        READ STORY <span>→</span>
                    </div>
                </div>
            </div>
        );
    }

    // Standard / Small Text Card
    const maxLines = Math.max(4, Math.floor(h * 3));

    return (
        <div className={styles.contentWrapper} style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isCentered ? 'center' : 'flex-start',
            textAlign: isCentered ? 'center' : 'left'
        }}>
            <div style={{ marginBottom: isCentered ? '1.5rem' : '0' }}>
                <h2 className={`${styles.headline} ${textSize}`} style={{
                    fontStyle: stylePreset === 'serif' ? 'italic' : 'normal',
                    fontSize: isCentered && (w * h > 100) ? '2rem' : undefined
                }}>{article.headline}</h2>
            </div>
            <div className={styles.body} style={{
                fontSize: '0.95rem',
                color: '#444',
                marginTop: isCentered ? '0' : '1rem',
                flex: isCentered ? '0 1 auto' : 1,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis'
            }}>
                {article.content}
            </div>
            {/* Small footer for medium cards */}
            {h > 6 && !isCentered && (
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eee', fontSize: '0.75rem', color: '#999' }}>
                    {article.author || 'APERTURE'} • {formatDate()}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// 3. PHOTO CARD
// ============================================================================
export const CardPhoto: React.FC<{ article: Article, w: number, h: number }> = ({ article, w, h }) => {
    // If very small, small text.
    const textSize = (w * h < 64) ? styles['text-s'] : styles['text-l'];

    return (
        <>
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: '#222', zIndex: 0, overflow: 'hidden',
                borderRadius: 'inherit'
            }}>
                {article.imageUrl && <img src={article.imageUrl} className={`${styles.cardImageFull} ${styles.zoomImage}`} style={{ display: 'block' }} />}
            </div>
            <div className={styles.overlayContent} style={{ zIndex: 1, position: 'relative' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                    <span className={styles.tag} style={{ color: 'rgba(255,255,255,0.9)' }}>In Focus</span>
                </div>
                <h2 className={`${styles.headline} ${textSize}`}>{article.headline}</h2>
            </div>
        </>
    );
};

// ============================================================================
// 4. VERTICAL CARD
// ============================================================================
export const CardVertical: React.FC<{ article: Article, w: number, h: number }> = ({ article, w, h }) => {
    // Cap font size for short strips
    const isNarrow = w < 6;
    const fontSize = h < 10 ? '1.1rem' : (isNarrow ? '1.2rem' : '1.4rem');

    return (
        <div style={{
            height: '100%',
            width: '100%',
            padding: isNarrow ? '1rem 0.5rem' : '1.5rem 1rem', // Reduce padding for thin strips
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#fff',
            borderRight: '1px solid rgba(0,0,0,0.1)',
            overflow: 'hidden'
        }}>
            <h2 className={styles.headline} style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: fontSize,
                lineHeight: '1.4',
                letterSpacing: '0.02em',
                margin: 0,
                maxHeight: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: 'Instrument Serif, serif',
                fontStyle: 'italic',
                color: '#000', // Explicit color
                textAlign: 'center'
            }}>
                {article.headline}
            </h2>
        </div>
    );
};
