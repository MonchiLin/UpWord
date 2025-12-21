import { useState } from 'react';
import { MacOSCalendar } from './MacOSCalender';
import DayDetailsSidebar from './DayDetailsSidebar';
import 'temporal-polyfill/global';

type HomeWorkspaceProps = {
    publishedDays: string[];
};

export default function HomeWorkspace({ publishedDays }: HomeWorkspaceProps) {
    // 初始状态默认今天（符合常见日历行为）。
    const [selectedDate, setSelectedDate] = useState<string | null>(
        Temporal.Now.plainDateISO().toString()
    );

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
            <div className="flex-1 p-4 lg:p-8 overflow-hidden flex flex-col items-center justify-center">
                <div className="max-w-4xl w-full h-full max-h-[800px]">
                    <MacOSCalendar
                        className="h-full"
                        publishedDays={publishedDays}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        dayHrefBase={undefined} // 禁用链接跳转
                    />
                </div>
            </div>

            <DayDetailsSidebar
                date={selectedDate}
                className="w-[340px] flex-shrink-0 shadow-xl z-10"
            />
        </div>
    );
}
