import { eq, inArray } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { Rating, State, fsrs, type CardInput, type Grade } from 'ts-fsrs';
import * as schema from '../../db/schema';
import { BUSINESS_TIMEZONE } from './time';

type Db = DrizzleD1Database<typeof schema>;

function toFsrsState(state: string): State {
	switch (state) {
		case 'new':
			return State.New;
		case 'learning':
			return State.Learning;
		case 'review':
			return State.Review;
		case 'relearning':
			return State.Relearning;
		default:
			throw new Error(`Unknown FSRS state: ${state}`);
	}
}

function toEpochDays(ymd: string) {
	const [y, m, d] = ymd.split('-').map((x) => Number(x));
	return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function toYmdInBusinessTz(date: Date) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: BUSINESS_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date);
}

function inferShanbaySyncGrade(args: {
	state: string;
	dueAt: Date;
	taskDate: string; // YYYY-MM-DD in BUSINESS_TIMEZONE
	lapses: number;
}): Grade {
	const dueDate = toYmdInBusinessTz(args.dueAt);
	const taskEpoch = toEpochDays(args.taskDate);
	const dueEpoch = toEpochDays(dueDate);

	const earlyDays = Math.max(0, dueEpoch - taskEpoch);
	const lateDays = Math.max(0, taskEpoch - dueEpoch);

	let grade: Grade;
	if (args.state === 'new' || args.state === 'learning') grade = Rating.Good;
	else if (args.state === 'relearning') grade = Rating.Hard;
	else if (args.state === 'review') {
		if (earlyDays >= 2) grade = Rating.Easy;
		else if (lateDays >= 2) grade = Rating.Hard;
		else grade = Rating.Good;
	} else {
		throw new Error(`Unknown word state: ${args.state}`);
	}

	if (args.lapses > 0 && lateDays >= 1 && grade === Rating.Good) grade = Rating.Hard;
	return grade;
}

function recordToCardInput(rec: typeof schema.wordLearningRecords.$inferSelect): CardInput {
	return {
		due: new Date(rec.dueAt),
		stability: rec.stability,
		difficulty: rec.difficulty,
		elapsed_days: rec.elapsedDays,
		scheduled_days: rec.scheduledDays,
		learning_steps: rec.learningSteps,
		reps: rec.reps,
		lapses: rec.lapses,
		state: toFsrsState(rec.state),
		last_review: rec.lastReviewAt ? new Date(rec.lastReviewAt) : null
	};
}

export async function applyShanbaySrsSync(db: Db, args: { taskDate: string; words: string[] }) {
	const uniqueWords = Array.from(new Set(args.words));
	if (uniqueWords.length === 0) return { updated: 0, skipped: 0 };

	// D1 can have a relatively low max bind-parameter limit in some environments (e.g. local dev).
	// Keep this conservative to avoid "too many SQL variables" errors.
	const SELECT_CHUNK_SIZE = 50;
	const records: Array<typeof schema.wordLearningRecords.$inferSelect> = [];
	for (let i = 0; i < uniqueWords.length; i += SELECT_CHUNK_SIZE) {
		const chunk = uniqueWords.slice(i, i + SELECT_CHUNK_SIZE);
		const rows = await db
			.select()
			.from(schema.wordLearningRecords)
			.where(inArray(schema.wordLearningRecords.word, chunk));
		records.push(...rows);
	}

	const recordByWord = new Map(records.map((r) => [r.word, r]));
	const now = new Date();
	const f = fsrs();

	let updated = 0;
	let skipped = 0;

	const statements = [];
	for (const word of uniqueWords) {
		const rec = recordByWord.get(word);
		if (!rec) throw new Error(`Missing word_learning_records for word: ${word}`);
		if (rec.lastShanbaySyncDate === args.taskDate) {
			skipped++;
			continue;
		}

		const grade = inferShanbaySyncGrade({
			state: rec.state,
			dueAt: new Date(rec.dueAt),
			taskDate: args.taskDate,
			lapses: rec.lapses
		});

		const { card } = f.next(recordToCardInput(rec), now, grade);
		statements.push(
			db
				.update(schema.wordLearningRecords)
				.set({
					lastShanbaySyncDate: args.taskDate,
					dueAt: card.due.toISOString(),
					stability: card.stability,
					difficulty: card.difficulty,
					elapsedDays: card.elapsed_days,
					scheduledDays: card.scheduled_days,
					learningSteps: card.learning_steps,
					reps: card.reps,
					lapses: card.lapses,
					state:
						card.state === State.New
							? 'new'
							: card.state === State.Learning
								? 'learning'
								: card.state === State.Review
									? 'review'
									: 'relearning',
					lastReviewAt: card.last_review ? card.last_review.toISOString() : null,
					updatedAt: now.toISOString()
				})
				.where(eq(schema.wordLearningRecords.word, word))
		);

		updated++;
	}

	for (const stmt of statements) {
		await stmt;
	}

	return { updated, skipped };
}
