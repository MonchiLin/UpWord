import React from 'react';
import styles from './Newspaper.module.css';
import type { Article } from './types';
import * as Cards from './cards';

// --- Main Card Dispatcher ---

export const ArticleCard: React.FC<{
    article: Article,
    style?: React.CSSProperties,
    variant: 'cover' | 'photo' | 'standard' | 'text' | 'vertical' | 'type-hero' | 'split' | 'brief' | 'author-focus' | 'category-focus' | 'split-33' | 'split-66' | 'quote' | 'featured' | 'swiss' | 'infographic' | 'interview' | 'location' | 'broadsheet' | 'modernist' | 'digest' | 'archivist',
    stylePreset?: 'default' | 'inverted' | 'accent' | 'serif' | 'minimal' | 'bordered',
    h: number,
    w: number
}> = ({ article, style, variant, stylePreset, h, w }) => {

    let content;

    // Dispatch based on variant
    switch (variant) {
        case 'cover':
            content = <Cards.CardCover article={article} w={w} h={h} />;
            break;
        case 'photo':
            content = <Cards.CardPhoto article={article} w={w} h={h} />;
            break;
        case 'vertical':
            content = <Cards.CardVertical article={article} w={w} h={h} />;
            break;
        case 'standard':
            content = <Cards.CardStandard article={article} w={w} h={h} />;
            break;
        case 'type-hero':
            content = <Cards.CardTypeHero article={article} h={h} />;
            break;
        case 'split':
            content = <Cards.CardSplitFeature article={article} w={w} h={h} ratio="50-50" />;
            break;
        case 'split-33':
            content = <Cards.CardSplitFeature article={article} w={w} h={h} ratio="33-66" />;
            break;
        case 'split-66':
            content = <Cards.CardSplitFeature article={article} w={w} h={h} ratio="66-33" />;
            break;
        case 'author-focus':
            content = <Cards.CardAuthorFocus article={article} />;
            break;
        case 'category-focus':
            content = <Cards.CardCategoryFocus article={article} />;
            break;
        case 'brief':
            content = <Cards.CardBrief article={article} />;
            break;
        case 'quote':
            content = <Cards.CardQuote article={article} />;
            break;
        case 'featured':
            content = <Cards.CardFeatured article={article} w={w} h={h} />;
            break;
        case 'swiss':
            content = <Cards.CardSwiss article={article} />;
            break;
        case 'infographic':
            content = <Cards.CardInfographic article={article} />;
            break;
        case 'interview':
            content = <Cards.CardInterview article={article} />;
            break;
        case 'location':
            content = <Cards.CardLocation article={article} />;
            break;
        // New styles
        case 'broadsheet':
            content = <Cards.CardBroadsheet article={article} w={w} h={h} />;
            break;
        case 'modernist':
            content = <Cards.CardModernist article={article} w={w} h={h} />;
            break;
        case 'digest':
            content = <Cards.CardDigest article={article} />;
            break;
        case 'archivist':
            content = <Cards.CardArchivist article={article} />;
            break;
        case 'text':
        default:
            content = <Cards.CardText article={article} w={w} h={h} stylePreset={stylePreset} />;
            break;
    }

    let presetClass = '';
    if (stylePreset && stylePreset !== 'default') {
        presetClass = styles[`preset-${stylePreset}`];
    }

    const wrapperClass = `${styles.card} ${variant === 'text' ? styles.cardTextOnly : styles.cardStandard} ${variant === 'cover' ? styles['bg-cover'] : ''} ${presetClass}`;

    return (
        <article className={wrapperClass} style={style}>
            {content}
        </article>
    );
};

