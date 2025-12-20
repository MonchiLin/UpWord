import type { Meta, StoryObj } from '@storybook/react';
import { AIChatSidebar } from '../components/AIChatSidebar';

const meta: Meta<typeof AIChatSidebar> = {
    title: 'Components/AIChatSidebar',
    component: AIChatSidebar,
    tags: ['autodocs'],
    argTypes: {
        isOpen: { control: 'boolean' },
        onClose: { action: 'closed' },
    },
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof AIChatSidebar>;

export const Default: Story = {
    args: {
        isOpen: true,
    },
    render: (args) => (
        <div className="relative h-screen w-full bg-zinc-100">
            <div className="p-10">
                <h1 className="text-2xl font-bold">New Project</h1>
                <p>Click the chat icon to open the assistant.</p>
            </div>
            <AIChatSidebar {...args} />
        </div>
    ),
};

export const WithHistory: Story = {
    args: {
        isOpen: true,
        initialMessages: [
            { id: '1', role: 'user', content: 'Hello, who are you?' },
            { id: '2', role: 'assistant', content: 'I am your AI Assistant, built with LobeHub UI and Vercel AI SDK.' },
            { id: '3', role: 'user', content: 'What can you do?' },
            { id: '4', role: 'assistant', content: 'I can help you write code, answer questions, and much more.' },
        ]
    },
    render: (args) => (
        <div className="relative h-screen w-full bg-zinc-100">
            <div className="p-10">
                <h1 className="text-2xl font-bold">History Mode</h1>
            </div>
            <AIChatSidebar {...args} />
        </div>
    ),
};

export const RichContent: Story = {
    args: {
        isOpen: true,
        initialMessages: [
            { id: '1', role: 'user', content: 'Can you show me a React button component with Tailwind?' },
            {
                id: '2',
                role: 'assistant',
                content: `Here is a simple button component:

\`\`\`tsx
import React from 'react';

interface ButtonProps {
  label: string;
  onClick?: () => void;
}

export const Button = ({ label, onClick }: ButtonProps) => (
  <button 
    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
    onClick={onClick}
  >
    {label}
  </button>
);
\`\`\`

### Features:
- **Responsive**: Adapts to hover states.
- **Accessible**: Uses standard button tag.

Let me know if you need anything else!`
            },
            { id: '3', role: 'user', content: 'Looks proper! How about a table?' },
            {
                id: '4',
                role: 'assistant',
                content: `Sure, here is a markdown table:

| Name | Role | Status |
|------|------|--------|
| React | Frontend | Active |
| Node  | Backend  | Stable |
| Astro | Framework| Fast   |

> Note: LobeHub UI renders this beautifully.`
            }
        ]
    },
    render: (args) => (
        <div className="relative h-screen w-full bg-zinc-100">
            <div className="p-10">
                <h1 className="text-2xl font-bold">Rich Content Example</h1>
                <p>Testing markdown, code blocks, and tables.</p>
            </div>
            <AIChatSidebar {...args} key="rich-content" />
        </div>
    ),
};
