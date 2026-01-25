
import type { Article } from './types';

// Shapes inspired by Editorial Design (New York Times, Monocle, Kinfolk)
export interface CardShape {
    id: string;
    description: string;
    w: number;
    h: number; // Grid Units (1 unit = 20px)
    variant: 'cover' | 'photo' | 'standard' | 'text' | 'vertical' | 'type-hero' | 'split' | 'brief' | 'author-focus' | 'category-focus' | 'split-33' | 'split-66' | 'quote' | 'featured' | 'swiss' | 'infographic' | 'interview' | 'location' | 'broadsheet' | 'modernist';
    stylePreset?: 'default' | 'inverted' | 'accent' | 'serif' | 'minimal' | 'bordered';
}

export const CARD_VARIANTS: CardShape[] = [
    // --- GROUP A: HEADLINES (Covers & Heros) ---
    {
        id: 'hero_regular',
        description: 'Main Cover',
        w: 18, h: 12,
        variant: 'cover',
        stylePreset: 'inverted'
    },
    {
        id: 'hero_compact',
        description: 'Hero Photo',
        w: 16, h: 10,
        variant: 'photo',
        stylePreset: 'minimal'
    },
    {
        id: 'location_focus',
        description: 'Map / Location',
        w: 12, h: 12,
        variant: 'location'
    },
    {
        id: 'swiss_poster',
        description: 'Swiss Poster (Statement)',
        w: 14, h: 16,
        variant: 'swiss'
    },

    // --- GROUP B: COLUMNS (Vertical Readers) ---
    {
        id: 'col_thin',
        description: 'Narrow Column',
        w: 5, h: 18,
        variant: 'vertical',
        stylePreset: 'inverted'
    },
    {
        id: 'col_regular',
        description: 'Standard Column',
        w: 8, h: 18,
        variant: 'standard'
    },
    {
        id: 'col_serif_reading',
        description: 'Longform Column',
        w: 9, h: 24,
        variant: 'text',
        stylePreset: 'serif'
    },

    // --- GROUP C: MODULES (Square & Rect) ---
    // Consolidated Square (Was m/l)
    {
        id: 'box_square',
        description: 'Square Standard',
        w: 12, h: 12,
        variant: 'standard',
        stylePreset: 'bordered'
    },
    {
        id: 'box_portrait',
        description: 'Portrait Photo',
        w: 10, h: 14,
        variant: 'photo'
    },
    {
        id: 'box_landscape',
        description: 'Landscape Photo',
        w: 14, h: 10,
        variant: 'standard'
    },
    {
        id: 'infographic_box',
        description: 'Data Feature',
        w: 10, h: 12,
        variant: 'infographic'
    },

    // --- GROUP D: EDITORIAL FEATURES ---
    {
        id: 'type_hero_sq',
        description: 'Typography Focus',
        w: 12, h: 12,
        variant: 'type-hero',
        stylePreset: 'minimal'
    },
    {
        id: 'feature_split_compact',
        description: 'Split Feature (50/50)',
        w: 18, h: 10,
        variant: 'split'
    },
    {
        id: 'feature_split_33',
        description: 'Split Feature (1/3 Image)',
        w: 18, h: 10,
        variant: 'split-33'
    },
    {
        id: 'feature_split_66',
        description: 'Split Feature (2/3 Image)',
        w: 18, h: 10,
        variant: 'split-66'
    },
    {
        id: 'quote_feature',
        description: 'Quote Feature',
        w: 12, h: 8,
        variant: 'quote',
        stylePreset: 'serif'
    },
    {
        id: 'featured_box',
        description: 'Featured Box',
        w: 12, h: 12,
        variant: 'featured',
        stylePreset: 'bordered'
    },
    {
        id: 'interview_block',
        description: 'Interview/Dialogue',
        w: 12, h: 14,
        variant: 'interview',
        stylePreset: 'serif'
    },

    // --- GROUP E: COMPACT / FILLERS ---
    // (Consolidated small items to 8x8 blocks)
    {
        id: 'author_focus_block',
        description: 'Author Spotlight',
        w: 10, h: 8,
        variant: 'author-focus',
        stylePreset: 'minimal'
    },
    {
        id: 'category_focus_block',
        description: 'Category Highlight',
        w: 8, h: 8,
        variant: 'category-focus',
        stylePreset: 'accent'
    },
    {
        id: 'brief_pad',
        description: 'News Brief',
        w: 8, h: 8,
        variant: 'brief'
    },
    {
        id: 'col_short',
        description: 'Short snippet',
        w: 6, h: 8,
        variant: 'text',
        stylePreset: 'minimal'
    },

    // --- GROUP F: NEW EDITORIAL STYLES ---
    {
        id: 'broadsheet_std',
        description: 'Broadsheet Classic',
        w: 12, h: 16,
        variant: 'broadsheet'
    },
    {
        id: 'modernist_wide',
        description: 'Modernist Wide',
        w: 16, h: 10,
        variant: 'modernist'
    },
    {
        id: 'modernist_sq',
        description: 'Modernist Square',
        w: 12, h: 12,
        variant: 'modernist'
    }
];

export function getRandomShape(size?: Article['size']): CardShape {
    // Simple filter mapping
    // XL -> Giants
    // L -> Boxes/Columns
    // M -> Boxes/Columns
    // S -> Extras

    let pool = CARD_VARIANTS;
    if (size === 'xl') pool = CARD_VARIANTS.filter(s => s.w >= 18 || s.h >= 20);
    else if (size === 's') pool = CARD_VARIANTS.filter(s => s.w * s.h < 100);
    else pool = CARD_VARIANTS.filter(s => s.w * s.h >= 100 && s.w * s.h < 400);

    return pool[Math.floor(Math.random() * pool.length)] || CARD_VARIANTS[0];
}
