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

    // Check if article exists and get its task id
    const articleRows = await db
        .select({ id: articles.id, generationTaskId: articles.generationTaskId })
        .from(articles)
        .where(eq(articles.id, id))
        .limit(1);
    if (!articleRows[0]) return notFound();

    const taskId = articleRows[0].generationTaskId;

    try {
        // Find all articles for this task (there might be multiple from before simplification)
        const allArticlesForTask = await db
            .select({ id: articles.id })
            .from(articles)
            .where(eq(articles.generationTaskId, taskId));
        const allArticleIds = allArticlesForTask.map(a => a.id);

        // Soft delete all associated highlights
        if (allArticleIds.length > 0) {
            const now = new Date().toISOString();
            await db.update(highlights).set({ deletedAt: now }).where(inArray(highlights.articleId, allArticleIds));
        }

        // Delete all articles for this task
        await db.delete(articles).where(eq(articles.generationTaskId, taskId));

        // Delete the task
        await db.delete(tasks).where(eq(tasks.id, taskId));
    } catch (e) {
        return badRequest('Failed to delete article', { message: (e as Error).message });
    }

    return json({ ok: true });
};
