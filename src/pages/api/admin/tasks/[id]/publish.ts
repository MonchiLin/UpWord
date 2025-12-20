import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { articles, tasks } from '../../../../../../db/schema';
import { requireAdmin } from '../../../../../lib/admin';
import { getDb } from '../../../../../lib/db';
import { badRequest, json, notFound } from '../../../../../lib/http';

const paramsSchema = z.object({
	id: z.string().uuid()
});

export const POST: APIRoute = async ({ request, locals, params }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	const parsed = paramsSchema.safeParse(params);
	if (!parsed.success) return badRequest('Invalid task id');

	const taskId = parsed.data.id;
	const db = getDb(locals);

	const taskRows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
	const task = taskRows[0];
	if (!task) return notFound();
	if (task.type !== 'article_generation') return badRequest('Only article_generation tasks can be published');
	if (task.status !== 'succeeded') return badRequest('Only succeeded tasks can be published');

	const now = new Date().toISOString();

	await db.batch([
		db.update(tasks).set({ publishedAt: now }).where(eq(tasks.id, taskId)),
		db
			.update(articles)
			.set({ status: 'published', publishedAt: now })
			.where(eq(articles.generationTaskId, taskId))
	]);

	return json({ ok: true, id: taskId, task_date: task.taskDate, published_at: now });
};
