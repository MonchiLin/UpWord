import type { APIRoute } from 'astro';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
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
        const publishedTasks = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.taskDate, date), eq(tasks.type, 'article_generation'), isNotNull(tasks.publishedAt)))
            .orderBy(tasks.publishedAt);

        const taskIds = publishedTasks.map((t) => t.id);
        const publishedArticles = taskIds.length > 0
            ? await db
                .select()
                .from(articles)
                .where(and(inArray(articles.generationTaskId, taskIds), eq(articles.status, 'published')))
                .orderBy(articles.model)
            : [];

        const articlesByTaskId = publishedArticles.reduce<Record<string, typeof publishedArticles>>((acc, article) => {
            const taskId = article.generationTaskId;
            if (!acc[taskId]) acc[taskId] = [];
            acc[taskId].push(article);
            return acc;
        }, {});

        const publishedTaskGroups = publishedTasks
            .map((task) => ({
                task,
                articles: articlesByTaskId[task.id] ?? []
            }))
            .filter((group) => group.articles.length > 0); // 过滤掉没有文章的分组

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
