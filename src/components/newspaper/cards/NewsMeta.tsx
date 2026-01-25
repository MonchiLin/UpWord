import React from 'react';
import styles from '../Newspaper.module.css';
import type { Article } from '../types';

// ============================================================================
// 1. CARD AUTHOR FOCUS
// ============================================================================
export const CardAuthorFocus: React.FC<{ article: Article }> = ({ article }) => {
    return (
        <div style={{
            height: '100%', width: '100%', padding: '1.5rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            background: '#f4f4f4', textAlign: 'center'
        }}>
            <div style={{
                width: '60px', height: '60px', borderRadius: '50%', background: '#ddd',
                marginBottom: '1rem', overflow: 'hidden'
            }}>
                {/* Fallback avatar or author image if available */}
                <img src={`https://ui-avatars.com/api/?name=${article.author?.replace(' ', '+') || 'A+D'}&background=000&color=fff`} style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{ fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', marginBottom: '0.5rem' }}>
                Columnist
            </div>
            <h3 className={styles.headline} style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                {article.author || 'Editorial Staff'}
            </h3>
            <div style={{ width: '20px', height: '2px', background: '#000', margin: '0.5rem auto' }}></div>
            <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#555', marginTop: '0.5rem' }}>
                "{article.headline}"
            </p>
        </div>
    );
};

// ============================================================================
// 2. CARD CATEGORY FOCUS
// ============================================================================
export const CardCategoryFocus: React.FC<{ article: Article }> = ({ article }) => {
    const category = article.category || "General";
    return (
        <div style={{
            height: '100%', width: '100%', padding: '1.5rem',
            display: 'flex', flexDirection: 'column',
            background: '#222', color: '#fff', position: 'relative'
        }}>
            <div style={{
                position: 'absolute', top: '10px', right: '10px',
                fontSize: '4rem', fontWeight: 900, opacity: 0.1, fontFamily: 'DM Sans',
                pointerEvents: 'none'
            }}>
                {category.substring(0, 2).toUpperCase()}
            </div>
            <span className={styles.tag} style={{ color: '#d62828', borderColor: '#d62828' }}>{category}</span>
            <div style={{ marginTop: 'auto' }}>
                <h3 className={styles.headline} style={{ fontSize: '1.3rem', color: '#fff' }}>
                    {article.headline}
                </h3>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                    View Section →
                </div>
            </div>
        </div>
    );
};
