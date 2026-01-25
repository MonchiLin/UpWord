import React from 'react';
import styles from '../Newspaper.module.css';
import type { Article } from '../types';

const formatDate = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

// ============================================================================
// 1. CARD COVER
// ============================================================================
export const CardCover: React.FC<{ article: Article, w: number, h: number }> = ({ article, w, h }) => {
    const isHuge = w >= 16 && h >= 16;
    const textSize = isHuge ? styles['text-xl'] : (w < 10 ? styles['text-s'] : styles['text-l']);
    const showSubhead = h > 10;

    return (
        <>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#222', overflow: 'hidden' }}>
                {article.imageUrl && <img src={article.imageUrl} className={styles.zoomImage} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.8 }} />}
            </div>
            <div style={{ position: 'relative', zIndex: 2, padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: 'auto' }}>
                    <span className={styles.tag} style={{ color: '#fff', borderBottom: '1px solid #fff', paddingBottom: '2px' }}>COVER STORY</span>
                </div>
                <div style={{ marginTop: 'auto' }}>
                    <h2 className={`${styles.headline} ${textSize}`}>{article.headline}</h2>
                    {article.subhead && showSubhead && <p className={styles.subhead} style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 300 }}>{article.subhead}</p>}
                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'DM Sans' }}>
                        {article.author || 'The Editorial Board'}
                    </div>
                </div>
            </div>
        </>
    );
};

// ============================================================================
// 2. CARD SPLIT FEATURE
// ============================================================================
export const CardSplitFeature: React.FC<{ article: Article, w: number, h: number, ratio?: '50-50' | '33-66' | '66-33' }> = ({ article, w, h, ratio = '50-50' }) => {
    let imageFlex = '0 0 55%';
    if (ratio === '33-66') imageFlex = '0 0 33%';
    if (ratio === '66-33') imageFlex = '0 0 66%';

    return (
        <div style={{
            display: 'flex', width: '100%', height: '100%',
            backgroundColor: '#fff',
            borderRadius: 'inherit',
            overflow: 'hidden'
        }}>
            <div style={{ flex: imageFlex, position: 'relative', overflow: 'hidden' }}>
                {article.imageUrl && <img src={article.imageUrl} className={styles.zoomImage} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </div>
            <div className={styles.contentWrapper} style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className={styles.tag} style={{ color: '#d62828' }}>EXCLUSIVE</span>
                <h2 className={styles.headline} style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>
                    {article.headline}
                </h2>
                <p className={styles.subhead} style={{ fontSize: '1rem', lineHeight: 1.6, color: '#555' }}>
                    {article.subhead || article.content.substring(0, 100) + '...'}
                </p>
                <div style={{ marginTop: '1.5rem', fontWeight: 700, fontSize: '0.9rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    Read Full Story →
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 3. CARD FEATURED
// ============================================================================
export const CardFeatured: React.FC<{ article: Article, w: number, h: number }> = ({ article, w, h }) => {
    const isLarge = w > 10;
    return (
        <div style={{
            height: '100%', width: '100%', padding: '6px',
            background: '#fff', border: '1px solid #ddd',
            borderRadius: 'inherit', boxSizing: 'border-box'
        }}>
            <div style={{
                width: '100%', height: '100%', border: '4px double #eee',
                padding: '1.5rem', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span className={styles.tag} style={{ background: '#000', color: '#fff', padding: '2px 6px' }}>MUST READ</span>
                    <span style={{ fontSize: '0.8rem', color: '#999' }}>{new Date().toLocaleDateString()}</span>
                </div>

                <h2 className={styles.headline} style={{ fontSize: isLarge ? '2rem' : '1.4rem', marginBottom: '1rem' }}>
                    {article.headline}
                </h2>

                <div style={{ flex: 1, overflow: 'hidden', marginBottom: '1rem' }}>
                    {article.imageUrl && (
                        <img src={article.imageUrl} style={{ float: 'left', width: '120px', height: '120px', objectFit: 'cover', marginRight: '1rem', marginBottom: '0.5rem' }} />
                    )}
                    <p style={{ fontSize: '1rem', lineHeight: 1.5, color: '#444' }}>
                        <span style={{ float: 'left', fontSize: '3rem', lineHeight: 0.8, fontWeight: 700, marginRight: '5px', marginTop: '-5px' }}>
                            {article.content.charAt(0)}
                        </span>
                        {article.content.substring(1, 150)}...
                    </p>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>
                    READ THE FULL STORY
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 4. CARD MODERNIST
// ============================================================================
export const CardModernist: React.FC<{ article: Article, w: number, h: number }> = ({ article, w, h }) => {
    const colors = ['#0033cc', '#ffcc00', '#ff3300', '#009933'];
    const accentColor = colors[article.headline.length % colors.length];
    const isWide = w > 12;

    return (
        <div style={{
            height: '100%', width: '100%',
            backgroundColor: '#fff',
            display: 'flex', flexDirection: isWide ? 'row' : 'column',
            border: '4px solid #000',
            borderRadius: '16px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                backgroundColor: accentColor,
                flex: isWide ? '0 0 35%' : '0 0 120px',
                padding: '1.5rem',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#fff'
            }}>
                <div style={{
                    writingMode: isWide ? 'vertical-lr' : 'horizontal-tb',
                    transform: isWide ? 'rotate(180deg)' : 'none',
                    fontWeight: 900, fontSize: '1.2rem', fontFamily: 'Inter, Helvetica, sans-serif',
                    textTransform: 'uppercase', letterSpacing: '-0.02em',
                    opacity: 0.9
                }}>
                    The Modernist
                </div>
                <div style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 0.8 }}>
                    0{article.headline.length % 9 + 1}
                </div>
            </div>

            <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                    borderBottom: '4px solid #000', marginBottom: '1rem', paddingBottom: '0.5rem',
                    fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase'
                }}>
                    {article.category || 'Architecture'}
                </div>
                <h2 className={styles.headline} style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    marginBottom: '1rem',
                    fontFamily: 'Inter, Helvetica, sans-serif'
                }}>
                    {article.headline}
                </h2>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    {article.imageUrl ? (
                        <img src={article.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.2)' }} />
                    ) : (
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.4, fontWeight: 500 }}>{article.content}</p>
                    )}
                </div>
                <div style={{
                    marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #000',
                    display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700
                }}>
                    <span>{new Date().toLocaleDateString()}</span>
                    <span>→ READ</span>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 5. CARD SWISS
// ============================================================================
export const CardSwiss: React.FC<{ article: Article }> = ({ article }) => {
    return (
        <div style={{
            height: '100%', width: '100%', padding: '2rem',
            background: 'var(--news-orange)', color: '#000',
            display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
            borderRadius: 'inherit'
        }}>
            <div style={{
                position: 'absolute', top: 0, left: '2rem', bottom: 0, width: '1px',
                background: 'rgba(0,0,0,0.1)', pointerEvents: 'none'
            }}></div>

            {article.imageUrl && (
                <div style={{
                    position: 'absolute', top: '2rem', right: '0',
                    width: '35%', height: '45%',
                    zIndex: 10,
                    overflow: 'hidden',
                    background: '#fff'
                }}>
                    <img src={article.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.2)' }} />
                </div>
            )}

            <div style={{ marginBottom: '1.5rem', borderTop: '4px solid #000', paddingTop: '0.5rem', width: '40px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Helv.
                </span>
            </div>

            <h2 style={{
                fontSize: '3rem', lineHeight: 0.85, fontWeight: 700, fontFamily: 'Helvetica, Arial, sans-serif',
                letterSpacing: '-0.04em', textTransform: 'uppercase',
                wordWrap: 'break-word', hyphens: 'auto',
                maxWidth: '90%',
                marginTop: 'auto', marginBottom: 'auto',
                zIndex: 11
            }}>
                {article.headline}
            </h2>

            <div style={{
                marginTop: 'auto',
                fontSize: '0.75rem', fontWeight: 600,
                display: 'flex', flexDirection: 'column', gap: '4px',
                borderLeft: '1px solid #000', paddingLeft: '0.5rem'
            }}>
                <span>NO. {new Date().getFullYear()}-{(new Date().getMonth() + 1).toString().padStart(2, '0')}</span>
                <span>{article.author || 'DESIGN BUREAU'}</span>
            </div>
        </div>
    );
};

// ============================================================================
// 6. CARD BROADSHEET
// ============================================================================
export const CardBroadsheet: React.FC<{ article: Article, w: number, h: number }> = ({ article, w, h }) => {
    return (
        <div style={{
            height: '100%', width: '100%',
            backgroundColor: '#f9f7f1',
            color: '#1a1a1a',
            padding: '1.5rem',
            border: '1px solid #e0dbd0',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <div style={{
                borderBottom: '1px solid #000',
                paddingBottom: '0.5rem', marginBottom: '1rem',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontFamily: 'Frank Ruhl Libre, serif', fontSize: '0.8rem', fontStyle: 'italic'
            }}>
                <span style={{ marginRight: '1rem' }}>VOL. I</span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                    {article.author || 'The Daily'}
                </span>
                <span style={{ marginLeft: '1rem' }}>NO. 04</span>
            </div>

            <h2 className={styles.headline} style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: h > 10 ? '2.5rem' : '1.8rem',
                lineHeight: 1.1,
                marginBottom: '1rem',
                textAlign: 'center'
            }}>
                {article.headline}
            </h2>

            {article.imageUrl && h > 12 && (
                <div style={{ marginBottom: '1rem', border: '1px solid #000', padding: '2px' }}>
                    <img src={article.imageUrl} style={{ width: '100%', height: '150px', objectFit: 'cover', filter: 'grayscale(100%) sepia(20%)' }} />
                    <div style={{ fontSize: '0.6rem', textAlign: 'right', marginTop: '2px', fontStyle: 'italic' }}>Fig. 1</div>
                </div>
            )}

            <div className={styles.broadsheetBody} style={{
                fontFamily: 'Merriweather, serif',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                textAlign: 'justify',
                columnCount: w > 10 ? 2 : 1,
                columnGap: '1.5rem',
                flex: 1,
                overflow: 'hidden'
            }}>
                <span style={{
                    float: 'left',
                    fontSize: '3.5rem',
                    lineHeight: 0.8,
                    fontWeight: 700,
                    marginRight: '0.5rem',
                    marginTop: '-0.2rem',
                    fontFamily: 'Playfair Display, serif'
                }}>
                    {article.content.charAt(0)}
                </span>
                {article.content.substring(1)}
            </div>
        </div>
    );
};

// ============================================================================
// 7. CARD TYPE HERO
// ============================================================================
export const CardTypeHero: React.FC<{ article: Article, h: number }> = ({ article, h }) => {
    const words = article.headline.split(' ');
    const firstWord = words[0];
    const rest = words.slice(1).join(' ');

    return (
        <div style={{
            height: '100%', width: '100%',
            padding: '2rem',
            display: 'flex', flexDirection: 'column',
            background: '#fafafa',
            borderRight: '1px solid rgba(0,0,0,0.08)',
            position: 'relative', overflow: 'hidden',
            borderRadius: 'inherit'
        }}>
            <div style={{
                position: 'absolute',
                top: '-2rem', left: '-2rem',
                fontSize: '8rem', fontWeight: 900,
                color: 'rgba(0,0,0,0.03)',
                lineHeight: 0.8,
                whiteSpace: 'nowrap',
                zIndex: 0,
                fontFamily: 'Inter, sans-serif'
            }}>
                {article.category || 'OPINION'}
            </div>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'auto' }}>
                    <span className={styles.tag} style={{ color: '#000', border: '2px solid #000', padding: '2px 8px', fontWeight: 900 }}>
                        {article.category || 'VOICES'}
                    </span>
                </div>

                <div style={{ marginTop: '1rem', marginBottom: '2rem', wordBreak: 'break-word', hyphens: 'auto' }}>
                    <div style={{
                        fontSize: '3.2rem', lineHeight: 0.9, fontWeight: 900,
                        letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif',
                        color: '#000', textTransform: 'uppercase'
                    }}>
                        {firstWord}
                    </div>
                    <div style={{
                        fontSize: '2rem', lineHeight: 1.2,
                        fontFamily: 'Frank Ruhl Libre, serif',
                        fontStyle: 'italic',
                        color: '#333',
                        marginTop: '0.5rem'
                    }}>
                        {rest}
                    </div>
                </div>

                <div style={{
                    marginTop: 'auto',
                    paddingTop: '1rem', borderTop: '4px solid #000',
                    display: 'flex', gap: '1rem', alignItems: 'center'
                }}>
                    <div style={{
                        width: '40px', height: '40px', background: '#000',
                        color: '#fff', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700
                    }}>
                        {article.author?.[0]}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{article.author}</span>
                        <span style={{ fontSize: '0.75rem', color: '#666' }}>Opinion Columnist</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
