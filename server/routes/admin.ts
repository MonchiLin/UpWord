import { Elysia } from 'elysia';
import { db } from '../src/db/factory';
import { TaskQueue } from '../src/services/tasks/queue';
import { DeletionService } from '../src/services/tasks/deletion';

interface AdminBody { task_date?: string; }

export const adminRoutes = (_queue: TaskQueue) => new Elysia({ prefix: '/api/admin' })
    .post('/tasks/retry-failed', async ({ body }) => {
        const b = body as AdminBody;
        const date = b?.task_date;

        let query = db.selectFrom('tasks').select('id').where('status', '=', 'failed');
        if (date) {
            query = query.where('task_date', '=', date);
        }

        const failedTasks = await query.execute();
        if (failedTasks.length === 0) return { status: "ok", count: 0 };

        const taskIds = failedTasks.map((t) => t.id);

        await db.updateTable('tasks')
            .set((eb) => ({
                status: 'queued',
                version: eb('version', '+', 1),
                started_at: null,
                finished_at: null,
                error_message: null,
                error_context_json: null
            }))
            .where('id', 'in', taskIds)
            .execute();

        return { status: "ok", count: taskIds.length };
    })
    .post('/tasks/delete-failed', async ({ body }) => {
        const b = body as AdminBody;
        const date = b?.task_date;

        let query = db.selectFrom('tasks').select('id').where('status', '=', 'failed');
        if (date) {
            query = query.where('task_date', '=', date);
        }

        const failedTasks = await query.execute();
        if (failedTasks.length === 0) return { status: "ok", count: 0 };

        const taskIds = failedTasks.map((t) => t.id);
        let deletedCount = 0;

        // Loop for safety and simplicity in admin logic (not performance critical)
        for (const taskId of taskIds) {
            try {
                await DeletionService.deleteTaskWithCascade(taskId);
                deletedCount++;
            } catch (e) {
                console.error(`Failed to delete task ${taskId}:`, e instanceof Error ? e.message : e);
            }
        }

        return { status: "ok", count: deletedCount, totalFound: taskIds.length };
    });
