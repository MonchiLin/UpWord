import type { Meta, StoryObj } from '@storybook/react';
import ArticleItemReact from '../components/day/ArticleItemReact';

const meta: Meta<typeof ArticleItemReact> = {
    title: 'Daily/ArticleItem',
    component: ArticleItemReact,
    parameters: {
        layout: 'padded',
        backgrounds: {
            default: 'paper',
            values: [
                { name: 'paper', value: '#F3F2EE' },
                { name: 'white', value: '#ffffff' },
            ],
        },
    },
    decorators: [
        (Story) => (
            <div className="max-w-3xl mx-auto py-12">
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ArticleItemReact>;

export const Default: Story = {
    args: {
        title: "Steam's Best-Selling and Most-Played Games of Early 2026",
        index: 0,
        isRead: false,
        date: '2026-01-14',
    },
};

export const LongTitle: Story = {
    args: {
        title: "Understanding the Complex Geopolitical Implications of the New Global Trade Agreement in the Context of Rising Semiconductor Demand",
        index: 1,
        isRead: false,
        date: '2026-01-14',
    },
};

export const Read: Story = {
    args: {
        title: "Gaming Industry Mergers and Acquisitions Reach Record Highs",
        index: 2,
        isRead: true,
        date: '2026-01-14',
    },
};

export const DoubleDigitIndex: Story = {
    args: {
        title: "A New Detective Game Debuts",
        index: 11,
        isRead: false,
        date: '2026-01-14',
    },
};
