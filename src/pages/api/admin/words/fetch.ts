import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dailyWords, words, wordLearningRecords } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { badRequest, json } from '../../../../lib/http';
import { getBusinessDate } from '../../../../lib/time';
import { fetchShanbayTodayWords } from '../../../../lib/shanbay';
import { applyShanbaySrsSync } from '../../../../lib/srs';

const bodySchema = z.object({
	task_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function uniqueStrings(input: string[]) {
	return Array.from(new Set(input.filter((x) => typeof x === 'string' && x.length > 0)));
}

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
		const shanbay = await fetchShanbayTodayWords(locals.runtime.env.SHANBAY_COOKIE);
		const newWords = uniqueStrings(shanbay.newWords ?? []);
		const reviewWords = uniqueStrings(shanbay.reviewWords ?? []);
		const total = newWords.length + reviewWords.length;
		if (total === 0) return badRequest('No words found from Shanbay.');

		const now = new Date().toISOString();
		await db
			.insert(dailyWords)
			.values({
				date: taskDate,
				newWordsJson: JSON.stringify(newWords),
				reviewWordsJson: JSON.stringify(reviewWords),
				createdAt: now,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: dailyWords.date,
				set: {
					newWordsJson: JSON.stringify(newWords),
					reviewWordsJson: JSON.stringify(reviewWords),
					updatedAt: now
				}
			});

		// Upsert words + word_learning_records
		const allWords = [...new Set([...newWords, ...reviewWords])];
		const WORD_INSERT_CHUNK_SIZE = 20;
		const RECORD_INSERT_CHUNK_SIZE = 10;

		for (let i = 0; i < allWords.length; i += WORD_INSERT_CHUNK_SIZE) {
			const chunk = allWords.slice(i, i + WORD_INSERT_CHUNK_SIZE);
			await db
				.insert(words)
				.values(chunk.map((w) => ({ word: w, origin: 'shanbay' as const })))
				.onConflictDoNothing();
		}

		for (let i = 0; i < allWords.length; i += RECORD_INSERT_CHUNK_SIZE) {
			const chunk = allWords.slice(i, i + RECORD_INSERT_CHUNK_SIZE);
			await db
				.insert(wordLearningRecords)
				.values(chunk.map((w) => ({ word: w })))
				.onConflictDoNothing();
		}

		// Apply SRS sync (推进 FSRS 状态)
		const srsSync = await applyShanbaySrsSync(db, { taskDate, words: allWords });

		return json(
			{
				ok: true,
				task_date: taskDate,
				new_count: newWords.length,
				review_count: reviewWords.length,
				srs_sync: srsSync
			},
			{ status: 201 }
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ ok: false, error: 'internal_error', message }, { status: 500 });
	}
};
