import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { articles, highlights, tasks } from '../../../../../db/schema';
import { getDb } from '../../../../lib/db';
import { json, notFound } from '../../../../lib/http';

export const GET: APIRoute = async ({ params, locals }) => {
	const articleId = params.id;
	if (!articleId) return notFound();

	const db = getDb(locals);

	const articleRows = await db
		.select({ id: articles.id })
		.from(articles)
		.where(eq(articles.id, articleId))
		.limit(1);

	if (!articleRows[0]) return notFound();

	const rows = await db
		.select()
		.from(highlights)
		.where(eq(highlights.articleId, articleId))
		.orderBy(highlights.createdAt);

	return json({
		ok: true,
		highlights: rows.map((h) => ({
			id: h.id,
			article_id: h.articleId,
			actor: h.actor,
			start_meta: JSON.parse(h.startMetaJson),
			end_meta: JSON.parse(h.endMetaJson),
			text: h.text,
			note: h.note,
			style: h.styleJson ? JSON.parse(h.styleJson) : null,
			created_at: h.createdAt,
			updated_at: h.updatedAt
		}))
	});
};
