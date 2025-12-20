import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { dailyWords } from '../../../../../db/schema';
import { getDb } from '../../../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
	const date = params.date;
	if (!date) {
		return new Response(JSON.stringify({ error: 'Date parameter is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const db = getDb(locals);
	try {
		const rows = await db.select().from(dailyWords).where(eq(dailyWords.date, date)).limit(1);
		const row = rows[0];
		if (!row) {
			return new Response(JSON.stringify({ date, words: [], word_count: 0 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const newWords = JSON.parse(row.newWordsJson);
		const reviewWords = JSON.parse(row.reviewWordsJson);
		const newList = Array.isArray(newWords) ? newWords : [];
		const reviewList = Array.isArray(reviewWords) ? reviewWords : [];
		return new Response(JSON.stringify({
			date,
			new_words: newList,
			review_words: reviewList,
			new_count: newList.length,
			review_count: reviewList.length,
			word_count: newList.length + reviewList.length
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: (error as Error).message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
