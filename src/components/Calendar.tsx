import React, { useMemo } from 'react';
import 'temporal-polyfill/global';
import { cn } from '../lib/utils';

type CalendarProps = {
    publishedDays?: string[]; // ISO 8601 strings (YYYY-MM-DD)
    onDateSelect?: (date: string) => void;
};

export const MacOSCalendar: React.FC<CalendarProps> = ({ publishedDays = [], onDateSelect }) => {
    // Initialize with today's date
    const today = Temporal.Now.plainDateISO();

    // Render range: 4 months back, 8 months forward (total 13 months)
    const startMonth = today.subtract({ months: 4 }).with({ day: 1 });

    // Generate list of months
    const months = useMemo(() => {
        const list = [];
        let current = startMonth;
        for (let i = 0; i < 13; i++) {
            list.push(current);
            current = current.add({ months: 1 });
        }
        return list;
    }, [startMonth]);

    // Scroll to today on mount
    React.useEffect(() => {
        const todayEl = document.getElementById(`day-${today.toString()}`);
        if (todayEl) {
            // Scroll with a bit of offset so headers don't obscure it
            todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [today]);

    // Helper to generate days for a specific month
    const getDaysForMonth = (month: Temporal.PlainDate) => {
        const firstDayOfMonth = month.with({ day: 1 });
        const startOfWeek = firstDayOfMonth.subtract({ days: firstDayOfMonth.dayOfWeek - 1 }); // Monday start

        // Find last day of month
        const nextMonth = month.add({ months: 1 });
        const lastDayOfMonth = nextMonth.subtract({ days: 1 });

        // End of grid is the Sunday after the last day
        const endOfWeek = lastDayOfMonth.add({ days: 7 - lastDayOfMonth.dayOfWeek });

        const days = [];
        let iter = startOfWeek;
        while (Temporal.PlainDate.compare(iter, endOfWeek) <= 0) {
            days.push(iter);
            iter = iter.add({ days: 1 });
        }
        return days;
    };

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className={cn(
            "flex flex-col h-full w-full font-sans transition-colors duration-300 relative",
            "bg-white text-[#37352f]"
        )}>
            {/* Sticky Global Header (Days of Week) */}
            <div className={cn(
                "grid grid-cols-7 z-20 sticky top-0",
                "border-gray-100 bg-white",
                "border-b"
            )}>
                {weekDays.map(day => (
                    <div key={day} className={cn(
                        "px-2 py-3 text-[11px] font-semibold uppercase tracking-widest border-r border-transparent last:border-r-0 text-center",
                        "text-gray-400"
                    )}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-200">
                {months.map(month => {
                    const monthDays = getDaysForMonth(month);
                    return (
                        <div key={month.toString()} className="flex flex-col relative group">
                            {/* Month Title as a distinct section divider */}
                            <div className={cn(
                                "sticky top-0 z-10 backdrop-blur-sm px-4 py-4 border-b",
                                "bg-white/95 border-gray-50"
                            )}>
                                <h3 className={cn(
                                    "text-xl font-bold select-none pl-1",
                                    "text-[#37352f]"
                                )}>
                                    {month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                                </h3>
                            </div>

                            <div className={cn(
                                "grid grid-cols-7 border-b",
                                "border-gray-100"
                            )}>
                                {monthDays.map((date, index) => {
                                    const isCurrentMonth = date.month === month.month;
                                    const isToday = date.equals(today);

                                    return (
                                        <div
                                            id={isToday ? `day-${date.toString()}` : undefined}
                                            key={date.toString()}
                                            onClick={() => onDateSelect?.(date.toString())}
                                            className={cn(
                                                "relative flex flex-col p-1.5 min-h-[120px] border-b border-r cursor-pointer transition-colors",
                                                "border-gray-100 hover:bg-gray-50",
                                                !isCurrentMonth && "bg-gray-50/20 text-gray-300",
                                                (index + 1) % 7 === 0 && "border-r-0"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[13px] font-medium w-6 h-6 flex items-center justify-center rounded-full ml-auto select-none font-medium",
                                                isToday ? "bg-[#EA4E43] text-white" : "text-gray-700",
                                                !isCurrentMonth && "opacity-30"
                                            )}>
                                                {date.day}
                                            </span>
                                            {/* Event Content */}
                                            <div className="flex flex-col gap-1 mt-1 w-full px-0.5">
                                                {publishedDays.includes(date.toString()) && (
                                                    <div className={cn(
                                                        "w-full px-1.5 py-0.5 text-[11px] leading-tight truncate rounded-sm shadow-sm",
                                                        isCurrentMonth
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "bg-gray-100 opacity-30"
                                                    )}>
                                                        <span className="opacity-70 mr-1">Completed</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

function ChevronLeftIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        </svg>
    )
}

function ChevronRightIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
    )
}
