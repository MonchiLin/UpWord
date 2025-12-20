import type { Meta, StoryObj } from '@storybook/react';
import 'temporal-polyfill/global';
import { MacOSCalendar } from '@/components/MacOSCalender';

const meta: Meta<typeof MacOSCalendar> = {
    title: 'Components/MacOSCalender',
    component: MacOSCalendar,
    tags: ['autodocs'],
    argTypes: {
        publishedDays: { control: 'object' },
    },
};

export default meta;

type Story = StoryObj<typeof MacOSCalendar>;

export const Default: Story = {
    args: {
        publishedDays: [],
    },
    render: (args) => (
        <div className="h-screen w-full bg-[#fcfbf8]">
            <MacOSCalendar {...args} />
        </div>
    ),
};

export const WithPublishedDays: Story = {
    args: {
        publishedDays: [
            Temporal.Now.plainDateISO().toString(),
            Temporal.Now.plainDateISO().subtract({ days: 2 }).toString(),
            Temporal.Now.plainDateISO().add({ days: 5 }).toString(),
        ],
    },
    render: (args) => (
        <div className="h-screen w-full bg-[#fcfbf8]">
            <MacOSCalendar {...args} />
        </div>
    ),
};
