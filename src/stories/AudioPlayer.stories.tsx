import type { Meta, StoryObj } from '@storybook/react';
import AudioPlayer from '../components/AudioPlayer';

const meta = {
    title: 'Components/AudioPlayer',
    component: AudioPlayer,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof AudioPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: "The Golden Discoveries",
        // Using a sample audio file or just leaving it empty to test UI
        audioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    render: (args) => (
        <div className="w-full max-w-2xl mx-auto mt-10">
            <AudioPlayer {...args} />
        </div>
    )
};

export const PlayingState: Story = {
    args: {
        title: "Podcast Episode 1",
        audioSrc: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    render: (args) => (
        <div className="w-full max-w-2xl mx-auto mt-10">
            <AudioPlayer {...args} />
        </div>
    )
};
