import { Elysia } from 'elysia';
import { db } from '../src/db/factory';
import { TaskQueue } from '../src/services/tasks/queue';
import { DeletionService } from '../src/services/tasks/deletion';
import { getBusinessDate } from '../src/lib/time';
import { toCamelCase } from '../src/utils/casing';

import { AppError } from '../src/errors/AppError';

interface GenerateBody { task_date?: string; date?: string; llm?: string; mode?: 'rss' | 'impression'; }

export const tasksRoutes = (queue: TaskQueue) => new Elysia({ prefix: '/api' })
    .post('/generate', async ({ body }) => {
        const b = body as GenerateBody;
        console.log("收到生成请求:", b);
        const date = b.task_date || b.date || getBusinessDate();

        const tasks = await queue.enqueue(date, 'manual', b.llm, b.mode);
        return { status: "ok", tasks: toCamelCase(tasks) };
    })
    .get('/tasks', async ({ query: { task_date } }) => {
        if (!task_date) throw AppError.badRequest("Missing task_date");

        // JOIN profile 表获取 profile 名称，便于前端展示任务所属配置
        const results = await db.selectFrom('tasks')
            .leftJoin('generation_profiles', 'tasks.profile_id', 'generation_profiles.id')
            .leftJoin('articles', (join) =>
                join
                    .onRef('tasks.id', '=', 'articles.generation_task_id')
                    .on('articles.variant', '=', 1)
            )
            .selectAll('tasks')
            .select([
                'generation_profiles.name as profile_name',
                'articles.title as article_title'
            ])
            .where('tasks.task_date', '=', task_date)
            .orderBy('tasks.created_at', 'desc')
            .execute();

        return { tasks: toCamelCase(results) };
    })
    .get('/tasks/:id', async ({ params: { id } }) => {
        const result = await db.selectFrom('tasks')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();

        if (!result) throw AppError.notFound();
        return toCamelCase(result);
    })
    .delete('/tasks/:id', async ({ params: { id } }) => {
        await DeletionService.deleteTaskWithCascade(id);
        return { status: "ok" };
    });
