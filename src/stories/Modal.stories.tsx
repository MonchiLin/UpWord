import type { Meta, StoryObj } from '@storybook/react';
import Modal from '../components/ui/Modal';
import { useState } from 'react';

const meta = {
    title: 'UI/Modal',
    component: Modal,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        width: { control: 'text' },
    },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        open: true,
        title: 'Modal Title',
        children: 'This is the modal content.',
        width: 600,
        onClose: () => { },
    },
    render: (args) => {
        const [open, setOpen] = useState(false);
        return (
            <div>
                <button onClick={() => setOpen(true)} className="px-4 py-2 bg-stone-900 text-white rounded-sm mb-4">
                    Open Modal
                </button>
                <Modal {...args} open={open} onClose={() => setOpen(false)} />
            </div>
        );
    }
};

export const Open: Story = {
    args: {
        open: true,
        title: 'Editor Config',
        width: 500,
        children: (
            <div className="space-y-4">
                <p>Configure your editor settings here.</p>
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-stone-700">Font Size</label>
                    <input type="number" className="w-full border p-2" defaultValue={16} />
                </div>
            </div>
        ),
        onClose: () => { },
    },
};
