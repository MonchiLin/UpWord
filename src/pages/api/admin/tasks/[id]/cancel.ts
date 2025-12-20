import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { tasks } from '../../../../../../db/schema';
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

	const now = new Date().toISOString();
	await db
		.update(tasks)
		.set({ status: 'canceled', finishedAt: now })
		.where(eq(tasks.id, taskId));

	return json({ ok: true, id: taskId, status: 'canceled', finished_at: now });
};

