import type { APIRoute } from 'astro';
import { eq, inArray } from 'drizzle-orm';
import { articles, highlights, tasks } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { json, notFound, badRequest } from '../../../../lib/http';

export const DELETE: APIRoute = async ({ params, request, locals }) => {
    const denied = requireAdmin(request, locals);
    if (denied) return denied;

    const id = params.id;
    if (!id) return notFound();

    const db = getDb(locals);

    // 检查文章是否存在并获取任务 ID
    const articleRows = await db
        .select({ id: articles.id, generationTaskId: articles.generationTaskId })
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1);
    if (!articleRows[0]) return notFound();

    const taskId = articleRows[0].generationTaskId;

    try {
        // 查找该任务下的全部文章（可能存在历史多条）
        const allArticlesForTask = await db
            .select({ id: articles.id })
            .from(articles)
            .where(eq(articles.generationTaskId, taskId));
        const allArticleIds = allArticlesForTask.map(a => a.id);

        // 软删关联高亮
        if (allArticleIds.length > 0) {
            const now = new Date().toISOString();
            await db.update(highlights).set({ deletedAt: now }).where(inArray(highlights.articleId, allArticleIds));
        }

        // 删除该任务下所有文章
        await db.delete(articles).where(eq(articles.generationTaskId, taskId));

        // 删除任务
        await db.delete(tasks).where(eq(tasks.id, taskId));
    } catch (e) {
        return badRequest('Failed to delete article', { message: (e as Error).message });
    }

    return json({ ok: true });
};
