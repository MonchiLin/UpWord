import type { Meta, StoryObj } from '@storybook/react';
import DayDetailsSidebar from '../components/DayDetailsSidebar';
import 'temporal-polyfill/global';

const meta = {
    title: 'Components/DayDetailsSidebar',
    component: DayDetailsSidebar,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="h-screen w-full bg-[#fcfbf8] flex justify-end">
                <div className="w-[400px] h-full border-l border-stone-200">
                    <Story />
                </div>
            </div>
        ),
    ],
} satisfies Meta<typeof DayDetailsSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock fetch for the story - we can't easily do this here without MSW or similar.
// For now, we will assume the component handles loading state.

export const Default: Story = {
    args: {
        date: Temporal.Now.plainDateISO().toString(),
    },
};

export const PastDate: Story = {
    args: {
        date: '2023-01-01',
    },
};
