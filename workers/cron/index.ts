import { drizzle } from 'drizzle-orm/d1';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import * as schema from '../../db/schema';
import { fetchAndStoreDailyWords } from '../../src/lib/words/dailyWords';
import { TaskQueue } from '../../src/lib/tasks/TaskQueue';

dayjs.extend(utc);
dayjs.extend(timezone);

const TJ_TIMEZONE = 'Asia/Shanghai';

type CronEnv = {
	DB: D1Database;
	SHANBAY_COOKIE: string;
	[key: string]: unknown;
};

export default {
	async scheduled(event: ScheduledEvent, env: CronEnv, ctx: ExecutionContext) {
		const db = drizzle(env.DB, { schema });
		const now = dayjs().tz(TJ_TIMEZONE);
		const taskDate = now.format('YYYY-MM-DD');
		const hour = now.hour();


		// === 1. Fetch Words (Keep this fast enough for CF) ===
		console.log(`[cron] Fetching words for ${taskDate}`);
		try {
			await fetchAndStoreDailyWords(db, {
				taskDate,
				shanbayCookie: env.SHANBAY_COOKIE
			});
		} catch (err) {
			console.error('[cron] Word fetch failed:', err);
		}

		// === 2. Auto Enqueue (Keep this fast enough for CF) ===
		console.log(`[cron] Auto-enqueuing tasks for ${taskDate}`);
		try {
			const queue = new TaskQueue(db);
			await queue.enqueue(taskDate, 'cron');
		} catch (err) {
			console.error('[cron] Enqueue failed:', err);
		}

		// === 3. Trigger Docker Processing (The heavy lifting) ===
		// We call the Docker app to handle long-running LLM research/generation
		const dockerAppUrl = env.DOCKER_APP_URL;
		if (dockerAppUrl && env.ADMIN_KEY) {
			console.log(`[cron] Triggering Docker processing at ${dockerAppUrl}`);
			ctx.waitUntil(
				fetch(`${dockerAppUrl}/api/admin/tasks/cron`, {
					method: 'POST',
					headers: {
						'x-admin-key': env.ADMIN_KEY,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({})
				})
			);
		} else {
			// Fallback: Still try to process in CF if no docker URL or ADMIN_KEY is set
			console.log(`[cron] DOCKER_APP_URL or ADMIN_KEY not set, falling back to local processing`);
			const queue = new TaskQueue(db);
			ctx.waitUntil(queue.processQueue(env as any));
		}
	}
};
