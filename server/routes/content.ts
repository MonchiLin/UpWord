import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';

export const contentRoutes = new Elysia({ prefix: '/api' })
    .get('/days', async () => {
        try {
            const result = await db.all(sql`SELECT DISTINCT task_date FROM tasks WHERE status = 'succeeded' ORDER BY task_date DESC`);
            return { days: result.map((r: any) => r.task_date) };
        } catch (e: any) {
            console.error("API Error /api/days:", e);
            return { error: e.message };
        }
    })
    .get('/day/:date', async ({ params: { date } }) => {
        try {
            const taskRows = await db.all(sql`
                SELECT * FROM tasks 
                WHERE task_date = ${date} AND type = 'article_generation' 
                ORDER BY finished_at
            `);

            const taskIds = taskRows.map((t: any) => t.id);
            let articles: any[] = [];

            if (taskIds.length > 0) {
                // Fetch articles for these tasks
                // Order by generation_task_id to group by task time roughly, then by model for consistency
                const sqlQuery = `SELECT * FROM articles WHERE generation_task_id IN (${taskIds.map(id => `'${id}'`).join(',')}) ORDER BY created_at ASC`;
                articles = await db.all(sql.raw(sqlQuery));
            }

            return { articles };
        } catch (e: any) {
            console.error(`[GET /api/day/${date}] Error:`, e);
            return { status: "error", message: e.message };
        }
    })
    .get('/day/:date/words', async ({ params: { date }, set }) => {
        try {
            const rows = await db.all(sql`SELECT * FROM daily_words WHERE date = ${date} LIMIT 1`);
            const row: any = rows[0];
            if (!row) {
                return { date, words: [], word_count: 0 };
            }

            const newWords = JSON.parse(row.new_words_json);
            const reviewWords = JSON.parse(row.review_words_json);
            const newList = Array.isArray(newWords) ? newWords : [];
            const reviewList = Array.isArray(reviewWords) ? reviewWords : [];

            // 单词数据拉取后永不变更，启用超长期缓存（1年）
            set.headers['Cache-Control'] = 'public, s-maxage=31536000, immutable';

            return {
                date,
                new_words: newList,
                review_words: reviewList,
                new_count: newList.length,
                review_count: reviewList.length,
                word_count: newList.length + reviewList.length
            };
        } catch (e: any) {
            console.error(`[GET /api/day/${date}/words] Error:`, e);
            return { status: "error", message: e.message };
        }
    });
