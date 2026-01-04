import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';

import { AppError } from '../src/errors/AppError';

export const articlesRoutes = new Elysia({ prefix: '/api/articles' })
    .get('/:id', async ({ params: { id } }) => {
        const articleRows = await db.all(sql`SELECT * FROM articles WHERE id = ${id} LIMIT 1`) as Array<{ generation_task_id: string }>;
        if (articleRows.length === 0) throw AppError.notFound();
        const article = articleRows[0]!;

        const taskRows = await db.all(sql`SELECT * FROM tasks WHERE id = ${article.generation_task_id} LIMIT 1`);
        const task = taskRows.length > 0 ? taskRows[0] : null;

        return { articles: article, tasks: task };
    })
    .patch('/:id/read', async ({ params: { id }, body }) => {
        const { level } = body as { level: number };
        // L1 -> 1 (001), L2 -> 3 (011), L3 -> 7 (111)
        const mask = (1 << level) - 1;

        await db.run(sql`
            UPDATE articles 
            SET read_levels = (read_levels | ${mask})
            WHERE id = ${id}
        `);
        return { status: "ok" };
    })
    .delete('/:id', async ({ params: { id } }) => {
        await db.run(sql`DELETE FROM highlights WHERE article_id = ${id}`);
        await db.run(sql`DELETE FROM article_word_index WHERE article_id = ${id}`);
        await db.run(sql`DELETE FROM articles WHERE id = ${id}`);
        return { status: "ok" };
    });
