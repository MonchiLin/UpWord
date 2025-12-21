import React, { useMemo } from 'react';
import 'temporal-polyfill/global';
import { cn } from '../lib/utils';

type CalendarProps = {
    publishedDays?: string[]; // ISO 8601 字符串（YYYY-MM-DD）
    onDateSelect?: (date: string) => void;
};

export const MacOSCalendar: React.FC<CalendarProps> = ({ publishedDays = [], onDateSelect }) => {
    // 初始化为今天
    const today = Temporal.Now.plainDateISO();

    // 渲染范围：向前 4 个月，向后 8 个月（共 13 个月）
    const startMonth = today.subtract({ months: 4 }).with({ day: 1 });

    // 生成月份列表
    const months = useMemo(() => {
        const list = [];
        let current = startMonth;
        for (let i = 0; i < 13; i++) {
            list.push(current);
            current = current.add({ months: 1 });
        }
        return list;
    }, [startMonth]);

    // 挂载时滚动到今天
    React.useEffect(() => {
        const todayEl = document.getElementById(`day-${today.toString()}`);
        if (todayEl) {
            // 略微偏移滚动，避免标题遮挡
            todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [today]);

    // 生成指定月份的日期列表
    const getDaysForMonth = (month: Temporal.PlainDate) => {
        const firstDayOfMonth = month.with({ day: 1 });
        const startOfWeek = firstDayOfMonth.subtract({ days: firstDayOfMonth.dayOfWeek - 1 }); // 周一为起始

        // 获取该月最后一天
        const nextMonth = month.add({ months: 1 });
        const lastDayOfMonth = nextMonth.subtract({ days: 1 });

        // 网格结束于该月最后一天之后的周日
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
            {/* 固定全局表头（星期） */}
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

            {/* 可滚动区域 */}
            <div className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-200">
                {months.map(month => {
                    const monthDays = getDaysForMonth(month);
                    return (
                        <div key={month.toString()} className="flex flex-col relative group">
                            {/* 月份标题作为分隔 */}
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
                                            {/* 事件内容 */}
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
