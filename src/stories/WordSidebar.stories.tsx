import type { Meta, StoryObj } from '@storybook/react';
import { WordSidebar } from '../components/WordSidebar';

const meta = {
    title: 'Components/WordSidebar',
    component: WordSidebar,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="h-screen bg-[#F3F2EE] border-l border-stone-300 w-80">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof WordSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleWords = [
    {
        word: "serendipity",
        phonetic: "/ˌser.ənˈdɪp.ə.ti/",
        definitions: [{ pos: 'n', definition: "The occurrence and development of events by chance in a happy or beneficial way." }],
        context: "It was pure serendipity that we met.",
        masteryStatus: 'unknown' as const
    },
    {
        word: "ephemeral",
        phonetic: "/əˈfem.ər.əl/",
        definitions: [{ pos: 'adj', definition: "Lasting for a very short time." }],
        context: "Fashions are ephemeral, changing with every season.",
        masteryStatus: 'unknown' as const
    },
    {
        word: "mellifluous",
        phonetic: "/məˈlɪf.lu.əs/",
        definitions: [{ pos: 'adj', definition: "(of a voice or words) sweet or musical; pleasant to hear." }],
        context: "She had a rich, mellifluous voice.",
        masteryStatus: 'unknown' as const
    },
    {
        word: "ineffable",
        phonetic: "/ɪnˈef.ə.bəl/",
        definitions: [{ pos: 'adj', definition: "Too great or extreme to be expressed or described in words." }],
        context: "The ineffable beauty of the sunrise.",
        masteryStatus: 'unknown' as const
    }
];

export const Default: Story = {
    args: {
        words: sampleWords,
    },
};

export const Empty: Story = {
    args: {
        words: [],
    },
};
