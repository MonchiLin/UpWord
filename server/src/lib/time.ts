import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Global default timezone
dayjs.tz.setDefault('Asia/Shanghai');

export const BUSINESS_TIMEZONE = 'Asia/Shanghai';

export function getBusinessDate(date: Date | string = new Date()) {
    return dayjs(date).tz(BUSINESS_TIMEZONE).format('YYYY-MM-DD');
}

export function getTodayStr() {
    return dayjs().tz(BUSINESS_TIMEZONE).format('YYYY-MM-DD');
}

export function formatTime(iso: string | null | undefined): string {
    if (!iso) return '-';
    try {
        return dayjs(iso).tz().format('HH:mm');
    } catch {
        return iso;
    }
}

export { dayjs };

