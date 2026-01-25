
import type { Meta, StoryObj } from '@storybook/react';
import { ArticleCard } from '../components/newspaper/ArticleCard';
import { CARD_VARIANTS } from '../components/newspaper/CardRegistry';
import type { Article } from '../components/newspaper/types';

const SHORT_GRAF = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
const LONG_CONTENT = `${SHORT_GRAF}\n\n${SHORT_GRAF}\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\n${SHORT_GRAF}`.repeat(5);

const MOCK_ARTICLE: Article = {
    id: 'demo-1',
    headline: 'The Quick Brown Fox Jumps Over The Lazy Dog',
    subhead: 'A sample subhead to demonstrate typography and spacing in this specific card variant.',
    author: 'Demo User',
    content: LONG_CONTENT,
    imageUrl: 'https://picsum.photos/seed/demo-1/800/600',
    size: 'm',
    location: 'main'
};

// Grid System Constants
const GRID_UNIT = 20;
const GRID_GAP = 24;

// Helper to calculate exact pixels
const toPx = (units: number) => `${units * GRID_UNIT + (Math.max(0, units - 1)) * GRID_GAP}px`;

const meta = {
    title: 'Newspaper/ArticleCard Variants',
    component: ArticleCard,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    argTypes: {
        w: { control: { type: 'range', min: 4, max: 24, step: 1 } },
        h: { control: { type: 'range', min: 4, max: 24, step: 1 } },
    }
} satisfies Meta<typeof ArticleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper for rendering a grid of variants
const VariantGrid = ({ items }: { items: Array<{ label: string, props: any }> }) => (
    <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '40px',
        backgroundColor: '#f4f1ea',
        padding: '40px',
        alignItems: 'flex-start',
        minHeight: '100vh',
        boxSizing: 'border-box'
    }}>
        {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{
                    margin: 0,
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {item.label}
                </h3>
                <div style={{
                    // Removed double shadow - let the Card provide the shadow
                    // boxShadow: '0 10px 30px rgba(0,0,0,0.08)', 
                    flexShrink: 0, // Prevent flex squashing
                    width: toPx(item.props.w),
                    height: toPx(item.props.h),
                    transition: 'all 0.3s ease'
                }}>
                    <ArticleCard
                        {...item.props}
                        style={{ width: '100%', height: '100%' }} // Fill container
                    />
                </div>
                <code style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>
                    {item.props.w}x{item.props.h} • {toPx(item.props.w)} x {toPx(item.props.h)}
                </code>
            </div>
        ))}
    </div>
);

// ============================================================================
// 1. CORE READING
// ============================================================================

export const CoreLayouts: Story = {
    args: { article: MOCK_ARTICLE, variant: 'standard', w: 8, h: 12 },
    render: () => <VariantGrid items={[
        {
            label: 'Standard Card',
            props: { article: MOCK_ARTICLE, variant: 'standard', w: 8, h: 12 }
        },
        {
            label: 'Text Only',
            props: { article: MOCK_ARTICLE, variant: 'text', w: 8, h: 12 }
        }
    ]} />
};

// ============================================================================
// 2. COVERS & HEROES
// ============================================================================

export const CoversAndHeroes: Story = {
    args: { article: MOCK_ARTICLE, variant: 'cover', w: 18, h: 12 },
    render: () => <VariantGrid items={[
        {
            label: 'Cover Story (XL)',
            props: { article: MOCK_ARTICLE, variant: 'cover', w: 18, h: 12 }
        },
        {
            label: 'Hero Photo (L)',
            props: { article: MOCK_ARTICLE, variant: 'photo', w: 16, h: 10 }
        }
    ]} />
};

// ============================================================================
// 3. EDITORIAL HIGHLIGHTS
// ============================================================================

export const EditorialCollection: Story = {
    args: { article: MOCK_ARTICLE, variant: 'broadsheet', w: 12, h: 16 },
    render: () => <VariantGrid items={[
        {
            label: 'The Broadsheet',
            props: { article: { ...MOCK_ARTICLE, headline: "The Return of The Classic Broadsheet Layout" }, variant: 'broadsheet', w: 12, h: 16 }
        },
        {
            label: 'Type Hero',
            props: { article: { ...MOCK_ARTICLE, headline: "Typography as Art" }, variant: 'type-hero', w: 12, h: 12 }
        },
        {
            label: 'Pull Quote',
            props: { article: { ...MOCK_ARTICLE, headline: "Design is intelligence made visible." }, variant: 'quote', w: 12, h: 8 }
        },
        {
            label: 'Interview',
            props: { article: { ...MOCK_ARTICLE, headline: "The Future of AI Design" }, variant: 'interview', w: 12, h: 14 }
        },
        {
            label: 'Featured Box',
            props: { article: MOCK_ARTICLE, variant: 'featured', w: 12, h: 12 }
        }
    ]} />
};

// ============================================================================
// 4. MODERN & BOLD
// ============================================================================

export const ModernAndBold: Story = {
    args: { article: MOCK_ARTICLE, variant: 'modernist', w: 12, h: 12 },
    render: () => <VariantGrid items={[
        {
            label: 'Swiss Poster',
            props: { article: { ...MOCK_ARTICLE, headline: "INTERNATIONAL STYLE" }, variant: 'swiss', w: 14, h: 16 }
        },
        {
            label: 'Modernist Wide',
            props: { article: { ...MOCK_ARTICLE, headline: "Bauhaus Principles" }, variant: 'modernist', w: 16, h: 10 }
        },
        {
            label: 'Modernist Square',
            props: { article: { ...MOCK_ARTICLE, headline: "Form Follows Function" }, variant: 'modernist', w: 12, h: 12 }
        },
        {
            label: 'Infographic',
            props: { article: { ...MOCK_ARTICLE, headline: "Year-Over-Year Growth" }, variant: 'infographic', w: 10, h: 12 }
        }
    ]} />
};

// ============================================================================
// 5. STRUCTURE & SPLITS
// ============================================================================

export const StructuralVariants: Story = {
    args: { article: MOCK_ARTICLE, variant: 'vertical', w: 5, h: 18 },
    render: () => <VariantGrid items={[
        {
            label: 'Vertical Strip',
            props: { article: { ...MOCK_ARTICLE, headline: 'VERTICAL NEWS' }, variant: 'vertical', w: 5, h: 18 }
        },
        {
            label: 'Split 50/50',
            props: { article: MOCK_ARTICLE, variant: 'split', w: 18, h: 10 }
        },
        {
            label: 'Split 33/66',
            props: { article: MOCK_ARTICLE, variant: 'split-33', w: 18, h: 10 }
        },
        {
            label: 'Split 66/33',
            props: { article: MOCK_ARTICLE, variant: 'split-66', w: 18, h: 10 }
        }
    ]} />
};

// ============================================================================
// 6. SMART MODULES
// ============================================================================

export const SmartModules: Story = {
    args: { article: MOCK_ARTICLE, variant: 'brief', w: 8, h: 8 },
    render: () => <VariantGrid items={[
        {
            label: 'Brief Pad',
            props: { article: { ...MOCK_ARTICLE, headline: "Breaking: Market Update" }, variant: 'brief', w: 8, h: 8 }
        },
        {
            label: 'Author Focus',
            props: { article: { ...MOCK_ARTICLE, author: 'Sarah Jenkins' }, variant: 'author-focus', w: 10, h: 8 }
        },
        {
            label: 'Category Focus',
            props: { article: { ...MOCK_ARTICLE, category: 'Tech' }, variant: 'category-focus', w: 8, h: 8 }
        },
        {
            label: 'Location',
            props: { article: { ...MOCK_ARTICLE, headline: "Hidden Gems of District 9" }, variant: 'location', w: 12, h: 12 }
        }
    ]} />
};

// ============================================================================
// 7. NEW VARIANTS (PHASE 3)
// ============================================================================

export const NewVariants: Story = {
    args: { article: MOCK_ARTICLE, variant: 'digest', w: 12, h: 12 },
    render: () => <VariantGrid items={[
        {
            label: 'Morning Briefing',
            props: {
                article: {
                    ...MOCK_ARTICLE,
                    headline: "Today's Briefing",
                    content: "Global markets rally as trade deal nears completion.\nTech sector sees unprecedented growth in AI adoption.\nLocal weather forecast predicts heavy rain for the weekend.\nSports: The Tigers clutch a last-minute victory."
                },
                variant: 'digest',
                w: 12,
                h: 14
            }
        },
        {
            label: 'The Archivist',
            props: {
                article: {
                    ...MOCK_ARTICLE,
                    id: "CASE-992-X",
                    headline: "Unidentified Signal",
                    category: "CLASSIFIED",
                    author: "Agent Mulder",
                    content: "Subject was last seen in Sector 7G. Evidence suggests high-level interference. Witness reports corroborate the timeline.",
                    imageUrl: "https://images.unsplash.com/photo-1517976487492-5750f3195933?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                },
                variant: 'archivist',
                w: 12,
                h: 16
            }
        }
    ]} />
};
