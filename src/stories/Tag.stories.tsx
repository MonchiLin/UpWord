
import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from '../components/ui/Tag';
import { Cross2Icon, CheckIcon, StarFilledIcon } from '@radix-ui/react-icons';

const meta = {
    title: 'UI/Tag',
    component: Tag,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['solid', 'outline', 'minimal', 'capsule', 'dot', 'gradient'],
        },
        color: {
            control: 'select',
            options: ['stone', 'blue', 'green', 'red', 'amber'],
        },
        size: {
            control: 'radio',
            options: ['sm', 'md', 'lg'],
        },
        clickable: { control: 'boolean' },
    },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

// 1. Basic usage
export const Default: Story = {
    args: {
        children: 'Topic Label',
        variant: 'solid',
    },
};

// 2. All Variants Gallery
export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-8 p-4 bg-white rounded-lg border border-stone-100">
            {/* Solid */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">01. Solid (Default)</h3>
                <p className="text-xs text-stone-500 mb-2">Standard badge style. Good for high density.</p>
                <div className="flex gap-2">
                    <Tag variant="solid">Solid Tag</Tag>
                    <Tag variant="solid" color="blue">Blue Solid</Tag>
                    <Tag variant="solid" icon={<StarFilledIcon />}>With Icon</Tag>
                </div>
            </div>

            {/* Outline */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">02. Outline</h3>
                <p className="text-xs text-stone-500 mb-2">Subtle border, transparent background.</p>
                <div className="flex gap-2">
                    <Tag variant="outline">Outline Tag</Tag>
                    <Tag variant="outline" color="blue">Blue Outline</Tag>
                    <Tag variant="outline" clickable icon={<CheckIcon />}>Selectable</Tag>
                </div>
            </div>

            {/* Minimal */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">03. Minimal</h3>
                <p className="text-xs text-stone-500 mb-2">Cleanest look. Text-heavy contexts.</p>
                <div className="flex gap-2">
                    <Tag variant="minimal">Minimal Tag</Tag>
                    <Tag variant="minimal" color="blue">Blue Minimal</Tag>
                    <Tag variant="minimal" size="sm">Small Minimal</Tag>
                </div>
            </div>

            {/* Capsule */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">04. Capsule</h3>
                <p className="text-xs text-stone-500 mb-2">Rounded pill shape. High contrast.</p>
                <div className="flex gap-2">
                    <Tag variant="capsule">Capsule Tag</Tag>
                    <Tag variant="capsule" color="blue">Blue Capsule</Tag>
                    <Tag variant="capsule" onClick={() => alert('Clicked!')} clickable icon={<Cross2Icon />}>Action</Tag>
                </div>
            </div>

            {/* Gradient */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">05. Gradient</h3>
                <p className="text-xs text-stone-500 mb-2">Premium feel for featured items.</p>
                <div className="flex gap-2">
                    <Tag variant="gradient">Gradient Tag</Tag>
                    <Tag variant="gradient" color="blue">Blue Gradient</Tag>
                </div>
            </div>

            {/* Dot */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">06. Dot</h3>
                <p className="text-xs text-stone-500 mb-2">Status indicator style.</p>
                <div className="flex gap-2">
                    <Tag variant="dot">Active Status</Tag>
                    <Tag variant="dot" color="blue">Processing</Tag>
                </div>
            </div>
        </div>
    )
};
