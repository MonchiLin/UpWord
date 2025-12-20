import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { articles, highlights } from '../../../../../../db/schema';
import { requireAdmin } from '../../../../../lib/admin';
import { getDb } from '../../../../../lib/db';
import { badRequest, json, notFound } from '../../../../../lib/http';

const metaSchema = z.object({}).passthrough();

const createHighlightBodySchema = z.object({
	id: z.string().min(1),
	start_meta: metaSchema,
	end_meta: metaSchema,
	text: z.string().min(1),
	note: z.string().optional().nullable(),
	style: z.unknown().optional().nullable()
});

export const POST: APIRoute = async ({ params, request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;

	const articleId = params.id;
	if (!articleId) return notFound();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return badRequest('Invalid JSON body');
	}

	const parsed = createHighlightBodySchema.safeParse(body);
	if (!parsed.success) return badRequest('Invalid request body', parsed.error.flatten());

	const db = getDb(locals);
	const exists = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, articleId)).limit(1);
	if (!exists[0]) return notFound();

	const data = parsed.data;
	try {
		await db.insert(highlights).values({
			id: data.id,
			articleId,
			actor: 'admin',
			startMetaJson: JSON.stringify(data.start_meta),
			endMetaJson: JSON.stringify(data.end_meta),
			text: data.text,
			note: data.note ?? null,
			styleJson: data.style == null ? null : JSON.stringify(data.style)
		});
	} catch (e) {
		return badRequest('Failed to create highlight', { message: (e as Error).message });
	}

	return json({ ok: true }, { status: 201 });
};
