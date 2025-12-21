import type { Meta, StoryObj } from '@storybook/react';
import { MacOSCalendar } from "@/components/Calendar.tsx"

const meta: Meta<typeof MacOSCalendar> = {
    title: 'Components/MacOSCalendar',
    component: MacOSCalendar,
    tags: ['autodocs'],
    argTypes: {
        publishedDays: { control: 'object' },
        onDateSelect: { action: 'dateSelected' },
    },
};

export default meta;
type Story = StoryObj<typeof MacOSCalendar>;

// 默认值为系统（自动）
export const Default: Story = {
    args: {
        publishedDays: [],
    },
    render: (args) => (
        <div className="h-screen w-full">
            <MacOSCalendar {...args} />
        </div>
    )
};

export const WithEvents: Story = {
    args: {
        publishedDays: [
            Temporal.Now.plainDateISO().toString(),
            Temporal.Now.plainDateISO().subtract({ days: 2 }).toString(),
            Temporal.Now.plainDateISO().add({ days: 5 }).toString(),
        ],
    },
    render: (args) => (
        <div className="h-screen w-full">
            <MacOSCalendar {...args} />
        </div>
    ),
};
