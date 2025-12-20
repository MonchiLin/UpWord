import type { Meta, StoryObj } from '@storybook/react';
import { ArticleReader } from '../components/ArticleReader';

const meta = {
    title: 'Components/ArticleReader',
    component: ArticleReader,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        level: {
            control: { type: 'select', options: [1, 2, 3] },
        },
        onLevelChange: { action: 'levelChanged' },
    },
} satisfies Meta<typeof ArticleReader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        id: "1",
        title: "China's Golden Discoveries: Unveiling Massive Gold Reserves",
        publishDate: "Friday, 2025/12/19",
        stats: {
            wordCount: 152,
            readingTime: "2 minutes",
            readCount: 614
        },
        level: 2,
        targetWords: ["boasts", "deposit", "geologists", "reserves", "deposits"],
        content: [
            "China has recently announced several significant gold discoveries that are reshaping estimates of its mineral wealth. The most notable find is the Dadonggou Gold Mine in Liaoning Province, which boasts an impressive 1,444.49 tons of gold. This makes it the largest single gold deposit discovered in China since 1949.",
            "In addition to the Liaoning discovery, geologists have identified another potentially massive gold deposit in the Kunlun Mountains of Xinjiang. Initial estimates suggest this deposit could contain over 1,000 tons of gold. These findings, along with a similar discovery in Hunan province, indicate that China's gold reserves may be substantially larger than previously thought.",
            "The rapid succession of these discoveries is particularly noteworthy. Prior to these announcements, the largest known gold deposits typically contained only a few hundred tons. These new finds suggest that China's untapped gold resources could be much more extensive, potentially altering the global landscape of gold reserves and production."
        ]
    },
};
