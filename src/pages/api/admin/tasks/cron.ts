import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';
import { TaskQueue } from '../../../../lib/tasks/TaskQueue';
import { requireAdmin } from '../../../../lib/admin';
import { json } from '../../../../lib/http';

export const POST: APIRoute = async ({ request, locals }) => {
    // 1. 验证管理员权限（由 CF Worker 传来 x-admin-key）
    const denied = requireAdmin(request, locals);
    if (denied) return denied;

    try {
        const db = getDb(locals);
        const queue = new TaskQueue(db);

        // 2. 异步启动队列处理。
        // 在 Docker (Node.js) 环境下，我们不需要 waitUntil，
        // 但为了保持接口快速返回，我们不 await processQueue 而是直接启动它。
        // 这样接口会立即返回 202 Accepted。
        console.log('[Docker Cron] Triggered queue processing');

        // 注意：在 Node 环境下，任务会一直运行直到结束，不会被杀死
        queue.processQueue(process.env as any).catch(err => {
            console.error('[Docker Cron] Background process failed:', err);
        });

        return json({ ok: true, message: 'Queue processing started in background' }, { status: 202 });
    } catch (err) {
        console.error('[Docker Cron] Failed to trigger queue:', err);
        return json({ ok: false, error: 'internal_error' }, { status: 500 });
    }
};
