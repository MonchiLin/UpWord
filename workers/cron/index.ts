import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { getBusinessDate, BUSINESS_TIMEZONE } from '../../src/lib/time';
import { fetchAndStoreDailyWords } from '../../src/lib/words/dailyWords';

// 业务时间以 Asia/Shanghai 计算（见 getBusinessHour）。
// 抓词窗口 08-23；生成任务不在 cron 中触发。
const FETCH_HOURS = new Set([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);

function getBusinessHour(date = new Date()) {
	const hourText = new Intl.DateTimeFormat('en-GB', {
		timeZone: BUSINESS_TIMEZONE,
		hour: '2-digit',
		hourCycle: 'h23'
	}).format(date);
	return Number(hourText);
}

type CronEnv = {
	DB: D1Database;
	SHANBAY_COOKIE: string;
};

export default {
	async scheduled(_event: ScheduledEvent, env: CronEnv, _ctx: ExecutionContext) {
		const db = drizzle(env.DB, { schema });
		const taskDate = getBusinessDate(new Date());
		const hour = getBusinessHour(new Date());

		if (!FETCH_HOURS.has(hour)) return;

		// 本次 tick 先抓词，成功后才允许生成。
		try {
			const result = await fetchAndStoreDailyWords(db, {
				taskDate,
				shanbayCookie: env.SHANBAY_COOKIE
			});
			console.log(
				`[cron] fetched words: ${result.newCount} new, ${result.reviewCount} review (${result.taskDate})`
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error('[cron] fetch words failed:', message);
			return;
		}
	}
};
