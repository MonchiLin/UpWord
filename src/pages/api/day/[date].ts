import type { APIRoute } from 'astro';
import { and, eq, inArray } from 'drizzle-orm';
import { articles, tasks } from '../../../../db/schema';
import { getDb } from '../../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
    const date = params.date;
    if (!date) {
        return new Response(JSON.stringify({ error: 'Date parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const db = getDb(locals);

    try {
        const taskRows = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.taskDate, date), eq(tasks.type, 'article_generation')))
            .orderBy(tasks.finishedAt);

        const taskIds = taskRows.map((t) => t.id);
        const articleRows = taskIds.length > 0
            ? await db
                .select()
                .from(articles)
                .where(inArray(articles.generationTaskId, taskIds))
                .orderBy(articles.model)
            : [];

        const articlesByTaskId = articleRows.reduce<Record<string, typeof articleRows>>((acc, article) => {
            const taskId = article.generationTaskId;
            if (!acc[taskId]) acc[taskId] = [];
            acc[taskId].push(article);
            return acc;
        }, {});

        const publishedTaskGroups = taskRows
            .map((task) => ({
                task,
                articles: articlesByTaskId[task.id] ?? []
            }))
            .filter((group) => group.articles.length > 0);

        return new Response(
            JSON.stringify({
                publishedTaskGroups
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
