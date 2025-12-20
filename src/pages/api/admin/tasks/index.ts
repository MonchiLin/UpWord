import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generationProfiles, tasks } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { badRequest, json } from '../../../../lib/http';

const querySchema = z.object({
	task_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const GET: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	const url = new URL(request.url);
	const parsed = querySchema.safeParse({
		task_date: url.searchParams.get('task_date') ?? undefined
	});
	if (!parsed.success) return badRequest('Invalid query', parsed.error.flatten());

	const db = getDb(locals);
	const baseQuery = db
		.select({
			id: tasks.id,
			taskDate: tasks.taskDate,
			type: tasks.type,
			triggerSource: tasks.triggerSource,
			status: tasks.status,
			profileId: tasks.profileId,
			resultJson: tasks.resultJson,
			errorMessage: tasks.errorMessage,
			errorContextJson: tasks.errorContextJson,
			createdAt: tasks.createdAt,
			startedAt: tasks.startedAt,
			finishedAt: tasks.finishedAt,
			publishedAt: tasks.publishedAt,
			profileName: generationProfiles.name,
			profileTopicPreference: generationProfiles.topicPreference
		})
		.from(tasks)
		.leftJoin(generationProfiles, eq(tasks.profileId, generationProfiles.id));

	const rows = parsed.data.task_date
		? await baseQuery.where(eq(tasks.taskDate, parsed.data.task_date)).orderBy(tasks.createdAt)
		: await baseQuery.orderBy(tasks.createdAt);

	return json({ ok: true, tasks: rows });
};
