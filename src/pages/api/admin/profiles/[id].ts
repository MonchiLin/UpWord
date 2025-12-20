import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generationProfiles, tasks } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { badRequest, json, notFound } from '../../../../lib/http';

const patchProfileBodySchema = z
	.object({
		name: z.string().min(1).optional(),
		topic_preference: z.string().min(1).optional(),
		model_setting: z.unknown().optional(),
		concurrency: z.number().int().positive().optional(),
		timeout_ms: z.number().int().positive().optional()
	})
	.refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const PATCH: APIRoute = async ({ params, request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	const id = params.id;
	if (!id) return notFound();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return badRequest('Invalid JSON body');
	}

	const parsed = patchProfileBodySchema.safeParse(body);
	if (!parsed.success) return badRequest('Invalid request body', parsed.error.flatten());

	const db = getDb(locals);
	const exists = await db.select({ id: generationProfiles.id }).from(generationProfiles).where(eq(generationProfiles.id, id)).limit(1);
	if (!exists[0]) return notFound();

	const now = new Date().toISOString();
	const data = parsed.data;
	const patch: Record<string, unknown> = { updatedAt: now };

	if ('name' in data) patch.name = data.name;
	if ('topic_preference' in data) patch.topicPreference = data.topic_preference;
	if ('model_setting' in data) patch.modelSettingJson = JSON.stringify(data.model_setting);
	if ('concurrency' in data) patch.concurrency = data.concurrency;
	if ('timeout_ms' in data) patch.timeoutMs = data.timeout_ms;

	try {
		await db.update(generationProfiles).set(patch).where(eq(generationProfiles.id, id));
	} catch (e) {
		return badRequest('Failed to update profile', { message: (e as Error).message });
	}

	return json({ ok: true });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	const id = params.id;
	if (!id) return notFound();

	const db = getDb(locals);
	const exists = await db.select({ id: generationProfiles.id }).from(generationProfiles).where(eq(generationProfiles.id, id)).limit(1);
	if (!exists[0]) return notFound();

	const used = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.profileId, id)).limit(1);
	if (used[0]) return badRequest('Cannot delete profile: tasks exist for this profile');

	try {
		await db.delete(generationProfiles).where(eq(generationProfiles.id, id));
	} catch (e) {
		return badRequest('Failed to delete profile', { message: (e as Error).message });
	}

	return json({ ok: true });
};
