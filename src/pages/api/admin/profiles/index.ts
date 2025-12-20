import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generationProfiles } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { badRequest, json } from '../../../../lib/http';

const createProfileBodySchema = z.object({
	name: z.string().min(1),
	topic_preference: z.string().min(1),
	model_setting: z.unknown(),
	concurrency: z.number().int().positive().default(1),
	timeout_ms: z.number().int().positive().default(1_800_000)
});

function mapProfile(row: typeof generationProfiles.$inferSelect) {
	const modelSetting = JSON.parse(row.modelSettingJson) as unknown;
	return {
		id: row.id,
		name: row.name,
		topic_preference: row.topicPreference,
		model_setting: modelSetting,
		concurrency: row.concurrency,
		timeout_ms: row.timeoutMs,
		created_at: row.createdAt,
		updated_at: row.updatedAt
	};
}

export const GET: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	const db = getDb(locals);
	const rows = await db.select().from(generationProfiles).orderBy(generationProfiles.createdAt);
	return json({ ok: true, profiles: rows.map(mapProfile) });
};

export const POST: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return badRequest('Invalid JSON body');
	}

	const parsed = createProfileBodySchema.safeParse(body);
	if (!parsed.success) return badRequest('Invalid request body', parsed.error.flatten());

	const data = parsed.data;
	const id = crypto.randomUUID();
	const modelSettingJson = JSON.stringify(data.model_setting);

	const db = getDb(locals);
	await db.insert(generationProfiles).values({
		id,
		name: data.name,
		topicPreference: data.topic_preference,
		modelSettingJson,
		concurrency: data.concurrency,
		timeoutMs: data.timeout_ms
	});

	return json({ ok: true, id }, { status: 201 });
};
