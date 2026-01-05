import { dayjs } from '../src/lib/time';
import { TaskQueue } from '../src/services/tasks/TaskQueue';
import { executeCronLogic, runDailyWordFetch, runTaskEnqueue } from '../lib/cronLogic';

const CRON_INTERVAL_MS = 60000; // Check every minute
let lastCronRunDate = '';

/**
 * Internal Cron Scheduler
 * 
 * Runs daily tasks at 09:00 CST (Asia/Shanghai).
 * Uses polling mechanism to check every minute.
 */
export function startCronScheduler(queue: TaskQueue) {
    setInterval(async () => {
        const now = dayjs();
        const hour = now.hour();
        const todayStr = now.format('YYYY-MM-DD');

        const minute = now.minute();

        // 1. Daily Word Fetch at 08:00
        if (hour === 8 && minute === 0) {
            if (lastCronRunDate !== todayStr + '_fetch') {
                console.log(`[Cron Scheduler] Triggering Daily Word Fetch (08:00)`);
                try {
                    await runDailyWordFetch(todayStr, '[Cron 08:00]');
                    lastCronRunDate = todayStr + '_fetch';
                } catch (e) {
                    console.error('[Cron Scheduler] 08:00 Fetch failed', e);
                }
            }
        }

        // 2. Article Generation (09:00 - 17:00), every 30 minutes (:00, :30)
        if (hour >= 9 && hour <= 17) {
            if (minute === 0 || minute === 30) {
                // To avoid double execution within the same minute (since interval is 60s),
                // we use a specific tag for this slot.
                const slotKey = `${todayStr}_${hour}_${minute}`;

                // Reuse lastCronRunDate mechanism or use a separate tracking?
                // The variable `lastCronRunDate` is a string, let's use it to track "last executed slot".
                if (lastCronRunDate !== slotKey) {
                    console.log(`[Cron Scheduler] Triggering Article Generation (${hour}:${minute.toString().padStart(2, '0')})`);
                    try {
                        await runTaskEnqueue(todayStr, `[Cron ${hour}:${minute}]`, queue);
                        lastCronRunDate = slotKey;
                    } catch (e) {
                        console.error(`[Cron Scheduler] Generation task failed`, e);
                    }
                }
            }
        }
    }, CRON_INTERVAL_MS);
    console.log("[Cron Scheduler] Started. Target window: 09:00 - 10:00 CST");
}
