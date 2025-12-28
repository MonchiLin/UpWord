import type { APIRoute } from 'astro';
import { and, eq, inArray } from 'drizzle-orm';
import { articles, highlights, tasks } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { json } from '../../../../lib/http';

export const POST: APIRoute = async ({ request, locals }) => {
    const denied = requireAdmin(request, locals);
    if (denied) return denied;

    try {
        const body = await request.json().catch(() => ({}));
        const taskDate = (body as any)?.task_date;

        const db = getDb(locals);

        // 查找所有失败的任务
        let taskIds: string[];

        if (taskDate && typeof taskDate === 'string') {
            // 指定日期的失败任务
            const failedTasks = await db
                .select({ id: tasks.id })
                .from(tasks)
                .where(and(eq(tasks.status, 'failed'), eq(tasks.taskDate, taskDate)));
            taskIds = failedTasks.map(t => t.id);
        } else {
            // 所有失败任务
            const failedTasks = await db
                .select({ id: tasks.id })
                .from(tasks)
                .where(eq(tasks.status, 'failed'));
            taskIds = failedTasks.map(t => t.id);
        }

        if (taskIds.length === 0) {
            return json({ ok: true, deleted: 0 });
        }

        // 删除关联的高亮和文章
        const CHUNK = 50;
        for (let i = 0; i < taskIds.length; i += CHUNK) {
            const chunk = taskIds.slice(i, i + CHUNK);

            // 查找这些任务关联的文章
            const articleRows = await db
                .select({ id: articles.id })
                .from(articles)
                .where(inArray(articles.generationTaskId, chunk));
            const articleIds = articleRows.map(r => r.id);

            // 删除高亮
            if (articleIds.length > 0) {
                for (let j = 0; j < articleIds.length; j += CHUNK) {
                    const articleChunk = articleIds.slice(j, j + CHUNK);
                    await db.delete(highlights).where(inArray(highlights.articleId, articleChunk));
                }
                // 删除文章
                await db.delete(articles).where(inArray(articles.id, articleIds));
            }

            // 删除任务
            await db.delete(tasks).where(inArray(tasks.id, chunk));
        }

        return json({ ok: true, deleted: taskIds.length });
    } catch (err) {
        console.error('POST /api/admin/tasks/delete-failed failed', err);
        const message = err instanceof Error ? err.message : String(err);
        return json({ ok: false, error: 'internal_error', message }, { status: 500 });
    }
};
