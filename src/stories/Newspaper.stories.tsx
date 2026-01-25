import type { Meta, StoryObj } from '@storybook/react';
import { Newspaper } from '../components/newspaper/Newspaper';
import type { Article } from '../components/newspaper/types';

const meta = {
    title: 'Layouts/Newspaper',
    component: Newspaper,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    argTypes: {
    },
} satisfies Meta<typeof Newspaper>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Mock Data Generator ---
const generateArticles = (count: number): Article[] => {
    const categories = ['World', 'Business', 'Tech', 'Arts', 'Opinion', 'Science'];
    const authors = ['J. Doe', 'A. Smith', 'Editor', 'Staff', 'Guest'];
    const headlines = [
        "Global Markets Rally as Tech Sector Booms",
        "New Policy Shifts Focus to Urban Development",
        "The Art of Minimalist Design in 2024",
        "Why Coffee Prices Are Skyrocketing",
        "Interview: The Future of AI in Medicine",
        "Opinion: We Need More Green Spaces",
        "Breaking: Major Discovery on Mars",
        "Local Hero Saves Cat from Tree",
        "Tech Giants Face New Regulations",
        "Review: The Best Films of the Year"
    ];

    const sizes: Article['size'][] = ['xl', 'l', 'm', 's'];
    const locations: Article['location'][] = ['main', 'sidebar-left', 'sidebar-right', 'bottom'];

    return Array.from({ length: count }).map((_, i) => ({
        id: `art-${i}`,
        headline: headlines[i % headlines.length] + (i > 9 ? ` ${i}` : ''),
        subhead: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        imageUrl: i % 3 === 0 ? `https://picsum.photos/seed/${i + 100}/800/600` : undefined,
        author: authors[i % authors.length],
        category: categories[i % categories.length],
        size: sizes[i % sizes.length],
        location: locations[i % locations.length] // Usually ignored by smart layout, but required by type
    }));
};

const ARTICLES = generateArticles(20);

export const Default: Story = {
    args: {
        articles: ARTICLES.slice(0, 12),
        date: 'Monday, Oct 26, 2026',
        issueNumber: 'Vol. CCLIV No. 12'
    },
    render: (args) => <Newspaper {...args} />,
};

export const FullEdition: Story = {
    args: {
        articles: ARTICLES, // More articles needed to fill "The Modernist" grid with variety
        date: 'Sunday, Oct 25, 2026',
        issueNumber: 'Vol. CCLIV No. 11 - Sunday Edition'
    },
    render: (args) => <Newspaper {...args} />,
};
