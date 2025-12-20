import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { highlights } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { badRequest, json, notFound } from '../../../../lib/http';

const updateHighlightBodySchema = z.object({
	note: z.string().optional().nullable(),
	style: z.unknown().optional().nullable()
});

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

	const parsed = updateHighlightBodySchema.safeParse(body);
	if (!parsed.success) return badRequest('Invalid request body', parsed.error.flatten());

	const db = getDb(locals);
	const exists = await db.select({ id: highlights.id }).from(highlights).where(eq(highlights.id, id)).limit(1);
	if (!exists[0]) return notFound();

	const patch: Record<string, unknown> = {
		updatedAt: new Date().toISOString()
	};
	if ('note' in parsed.data) patch.note = parsed.data.note ?? null;
	if ('style' in parsed.data) patch.styleJson = parsed.data.style == null ? null : JSON.stringify(parsed.data.style);

	try {
		await db.update(highlights).set(patch).where(eq(highlights.id, id));
	} catch (e) {
		return badRequest('Failed to update highlight', { message: (e as Error).message });
	}

	return json({ ok: true });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	const id = params.id;
	if (!id) return notFound();

	const db = getDb(locals);
	const exists = await db.select({ id: highlights.id }).from(highlights).where(eq(highlights.id, id)).limit(1);
	if (!exists[0]) return notFound();

	const now = new Date().toISOString();
	await db.update(highlights).set({ deletedAt: now, updatedAt: now }).where(eq(highlights.id, id));

	return json({ ok: true });
};
