import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq, lt } from 'drizzle-orm';
import { generationProfiles, tasks } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { badRequest, json } from '../../../../lib/http';
import { getBusinessDate } from '../../../../lib/time';
import { runArticleGenerationTask } from '../../../../lib/tasks/articleGeneration';
import mockData from "@/lib/tasks/mockData.json";

const bodySchema = z.object({
	task_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// Timeout for stale running tasks (10 minutes)
const STALE_TASK_TIMEOUT_MS = 10 * 60 * 1000;

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	try {
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			body = {};
		}

		const parsed = bodySchema.safeParse(body);
		if (!parsed.success) return badRequest('Invalid request body', parsed.error.flatten());

		const db = getDb(locals);
		const taskDate = parsed.data.task_date ?? getBusinessDate();

		// const dailyRows = await db.select({ date: dailyWords.date }).from(dailyWords).where(eq(dailyWords.date, taskDate)).limit(1);
		// 暂时使用模拟数据, 后面再换
		const dailyRows = [
			{
				...mockData,
				newWordsJson: JSON.stringify(mockData.newWordsJson),
				reviewWordsJson: JSON.stringify(mockData.reviewWordsJson),
			}
		];
		if (!dailyRows[0]) return badRequest('No daily words found. Fetch words first.');

		const profiles = await db.select({ id: generationProfiles.id }).from(generationProfiles).orderBy(generationProfiles.createdAt);
		if (profiles.length === 0) return badRequest('No generation profile found. Create one first.');

		// Cleanup stale running tasks (running for more than 10 minutes)
		const staleThreshold = new Date(Date.now() - STALE_TASK_TIMEOUT_MS).toISOString();
		await db
			.update(tasks)
			.set({
				status: 'failed',
				errorMessage: 'Task timed out (exceeded 10 minutes)',
				finishedAt: new Date().toISOString()
			})
			.where(
				and(
					eq(tasks.taskDate, taskDate),
					eq(tasks.status, 'running'),
					lt(tasks.startedAt, staleThreshold)
				)
			);

		const created: Array<{ id: string; profile_id: string }> = [];
		const inserts = [];
		for (const p of profiles) {
			const id = crypto.randomUUID();
			created.push({ id, profile_id: p.id });
			inserts.push(
				db.insert(tasks).values({
					id,
					taskDate,
					type: 'article_generation',
					triggerSource: 'manual',
					status: 'queued',
					profileId: p.id
				})
			);
		}

		await db.batch(inserts as [any, ...any[]]);

		// Check if any task is currently running for this date
		const runningTasks = await db
			.select({ id: tasks.id })
			.from(tasks)
			.where(and(eq(tasks.taskDate, taskDate), eq(tasks.status, 'running')))
			.limit(1);

		// Only start the first queued task if nothing is running
		if (runningTasks.length === 0 && created.length > 0) {
			locals.runtime.ctx.waitUntil(runArticleGenerationTask(locals, created[0].id));
		}

		return json({ ok: true, task_date: taskDate, tasks: created }, { status: 201 });
	} catch (err) {
		console.error('POST /api/admin/tasks/generate failed', err);
		const message = err instanceof Error ? err.message : String(err);
		return json({ ok: false, error: 'internal_error', message }, { status: 500 });
	}
};
