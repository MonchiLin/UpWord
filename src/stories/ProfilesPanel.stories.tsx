import type { Meta, StoryObj } from '@storybook/react';
import ProfilesPanel from '../components/ProfilesPanel';

const meta = {
    title: 'Components/ProfilesPanel',
    component: ProfilesPanel,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="p-8 bg-[#F3F2EE] min-h-screen">
                <div className="max-w-4xl mx-auto bg-white p-6 border border-stone-200">
                    <Story />
                </div>
            </div>
        ),
    ],
} satisfies Meta<typeof ProfilesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;



// We can't easily mock fetch globally in a simple story file without setup, 
// so this story will likely show the "loading" or "empty" state unless we mock it at a higher level.
// However, we can visualize the structure.

export const Default: Story = {
    args: {
        adminKey: 'test-key',
    },
};
