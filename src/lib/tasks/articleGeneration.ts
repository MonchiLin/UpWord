import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { articles, dailyWords, generationProfiles, tasks, wordLearningRecords } from '../../../db/schema';
import { getDb } from '../db';
import { generateDailyNewsWithWordSelection, type CandidateWord } from '../llm/openaiCompatible';
import { DAILY_NEWS_SYSTEM_PROMPT } from '../prompts/dailyNews';

const modelSettingSchema = z.object({
	model: z.string().min(1),
	temperature: z.number().min(0).max(2).optional().default(0.7),
	max_output_tokens: z.number().int().positive().optional().default(1800)
});

function uniqueStrings(input: string[]) {
	return Array.from(new Set(input.filter((x) => typeof x === 'string' && x.length > 0)));
}

function mergeResultJson(prev: unknown, next: Record<string, unknown>) {
	if (prev && typeof prev === 'object' && !Array.isArray(prev)) return { ...(prev as any), ...next };
	return next;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	let t: ReturnType<typeof setTimeout> | null = null;
	try {
		return await Promise.race([
			promise,
			new Promise<T>((_, reject) => {
				t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
			})
		]);
	} finally {
		if (t) clearTimeout(t);
	}
}

/**
 * Get words that have already been used in articles today
 */
async function getUsedWordsToday(db: ReturnType<typeof getDb>, taskDate: string): Promise<Set<string>> {
	// Find all tasks for today
	const todaysTasks = await db
		.select({ id: tasks.id })
		.from(tasks)
		.where(eq(tasks.taskDate, taskDate));

	if (todaysTasks.length === 0) return new Set();

	// Find all articles for today's tasks
	const usedWords = new Set<string>();
	for (const task of todaysTasks) {
		const taskArticles = await db
			.select({ contentJson: articles.contentJson })
			.from(articles)
			.where(eq(articles.generationTaskId, task.id));

		for (const article of taskArticles) {
			try {
				const content = JSON.parse(article.contentJson);
				const selected = content?.input_words?.selected;
				if (Array.isArray(selected)) {
					for (const word of selected) {
						if (typeof word === 'string') usedWords.add(word);
					}
				}
			} catch {
				// Ignore parse errors
			}
		}
	}

	return usedWords;
}

/**
 * Build candidate words with SRS information, excluding already used words
 */
async function buildCandidateWords(
	db: ReturnType<typeof getDb>,
	newWords: string[],
	reviewWords: string[],
	usedWords: Set<string>,
	taskDate: string
): Promise<CandidateWord[]> {
	const allWords = uniqueStrings([...newWords, ...reviewWords]).filter((w) => !usedWords.has(w));
	if (allWords.length === 0) return [];

	// Get SRS records for all words
	const records = await db
		.select()
		.from(wordLearningRecords)
		.where(eq(wordLearningRecords.word, allWords[0])); // Start with first word

	// Query all words in chunks
	const CHUNK_SIZE = 50;
	const allRecords: Array<typeof wordLearningRecords.$inferSelect> = [];
	for (let i = 0; i < allWords.length; i += CHUNK_SIZE) {
		const chunk = allWords.slice(i, i + CHUNK_SIZE);
		for (const word of chunk) {
			const rows = await db
				.select()
				.from(wordLearningRecords)
				.where(eq(wordLearningRecords.word, word));
			allRecords.push(...rows);
		}
	}

	const recordByWord = new Map(allRecords.map((r) => [r.word, r]));
	const newWordSet = new Set(newWords);

	// Calculate due status for each word
	const now = new Date();
	const candidates: CandidateWord[] = [];

	for (const word of allWords) {
		const record = recordByWord.get(word);
		const type = newWordSet.has(word) ? 'new' : 'review';
		const state = (record?.state ?? 'new') as CandidateWord['state'];
		const dueAt = record?.dueAt ? new Date(record.dueAt) : now;
		const due = dueAt <= now;

		candidates.push({ word, type, due, state });
	}

	// Sort by priority: new+due > review+due > due > new > review
	candidates.sort((a, b) => {
		const scoreA = (a.type === 'new' ? 2 : 0) + (a.due ? 4 : 0);
		const scoreB = (b.type === 'new' ? 2 : 0) + (b.due ? 4 : 0);
		return scoreB - scoreA;
	});

	return candidates;
}

export async function runArticleGenerationTask(locals: App.Locals, taskId: string) {
	const db = getDb(locals);
	const env = locals.runtime.env;

	const taskRows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
	const task = taskRows[0];
	if (!task) throw new Error(`Task not found: ${taskId}`);

	// Store taskDate for use in finally block
	const taskDate = task.taskDate;

	const now = new Date().toISOString();
	await db.update(tasks).set({ status: 'running', startedAt: now }).where(eq(tasks.id, taskId));

	let stage = 'init';
	try {
		stage = 'load_profile';
		const profileRows = await db.select().from(generationProfiles).where(eq(generationProfiles.id, task.profileId)).limit(1);
		const profile = profileRows[0];
		if (!profile) throw new Error(`Generation profile not found: ${task.profileId}`);

		stage = 'load_daily_words';
		const dailyRows = await db.select().from(dailyWords).where(eq(dailyWords.date, task.taskDate)).limit(1);
		const dailyRow = dailyRows[0];
		if (!dailyRow) {
			await db
				.update(tasks)
				.set({
					status: 'failed',
					errorMessage: 'No daily words found. Fetch words before generating.',
					errorContextJson: JSON.stringify({ stage: 'load_daily_words', reason: 'no_daily_words_record' }),
					finishedAt: new Date().toISOString()
				})
				.where(eq(tasks.id, taskId));
			return;
		}

		const dailyNew = dailyRow.newWordsJson ? JSON.parse(dailyRow.newWordsJson) : [];
		const dailyReview = dailyRow.reviewWordsJson ? JSON.parse(dailyRow.reviewWordsJson) : [];
		const newWords = uniqueStrings(Array.isArray(dailyNew) ? dailyNew : []);
		const reviewWords = uniqueStrings(Array.isArray(dailyReview) ? dailyReview : []);

		if (newWords.length + reviewWords.length === 0) {
			await db
				.update(tasks)
				.set({
					status: 'failed',
					errorMessage: 'Daily words record is empty.',
					errorContextJson: JSON.stringify({ stage: 'load_daily_words', reason: 'empty_daily_words' }),
					finishedAt: new Date().toISOString()
				})
				.where(eq(tasks.id, taskId));
			return;
		}

		stage = 'get_used_words';
		const usedWords = await getUsedWordsToday(db, task.taskDate);

		stage = 'build_candidates';
		const candidates = await buildCandidateWords(db, newWords, reviewWords, usedWords, task.taskDate);

		if (candidates.length === 0) {
			await db
				.update(tasks)
				.set({
					status: 'failed',
					errorMessage: 'All words have been used in articles today. No remaining words.',
					errorContextJson: JSON.stringify({ stage: 'build_candidates', reason: 'no_remaining_words', used_count: usedWords.size }),
					finishedAt: new Date().toISOString()
				})
				.where(eq(tasks.id, taskId));
			return;
		}

		const baseResult = {
			new_count: newWords.length,
			review_count: reviewWords.length,
			used_today_count: usedWords.size,
			candidate_count: candidates.length,
			input_words: { new: newWords, review: reviewWords }
		};

		stage = 'persist_task_result';
		await db.update(tasks).set({ resultJson: JSON.stringify(baseResult) }).where(eq(tasks.id, taskId));

		stage = 'parse_model_setting';
		const modelSettingParsed = modelSettingSchema.safeParse(JSON.parse(profile.modelSettingJson));
		if (!modelSettingParsed.success) {
			throw new Error(`Invalid model_setting_json: ${modelSettingParsed.error.message}`);
		}

		stage = 'llm_generate';
		const output = await withTimeout(
			generateDailyNewsWithWordSelection({
				env,
				model: modelSettingParsed.data.model,
				systemPrompt: DAILY_NEWS_SYSTEM_PROMPT,
				currentDate: task.taskDate,
				topicPreference: profile.topicPreference,
				candidateWords: candidates,
				temperature: modelSettingParsed.data.temperature,
				maxOutputTokens: modelSettingParsed.data.max_output_tokens
			}),
			profile.timeoutMs,
			`LLM ${modelSettingParsed.data.model}`
		);

		const articleId = crypto.randomUUID();

		const contentData = {
			schema: 'daily_news_v2',
			task_date: task.taskDate,
			topic_preference: profile.topicPreference,
			input_words: {
				new: newWords,
				review: reviewWords,
				candidates: candidates.map((c) => c.word),
				selected: output.selectedWords
			},
			word_usage_check: output.output.word_usage_check,
			result: output.output
		};

		stage = 'persist_generated';
		const finishedAt = new Date().toISOString();
		const merged = mergeResultJson(baseResult, {
			selected_words: output.selectedWords,
			generated: { model: modelSettingParsed.data.model, article_id: articleId },
			usage: output.usage ?? null
		});

		const statements: any[] = [
			db.insert(articles).values({
				id: articleId,
				generationTaskId: taskId,
				model: modelSettingParsed.data.model,
				variant: 1,
				title: output.output.title,
				contentJson: JSON.stringify(contentData),
				status: 'published' as const,
				publishedAt: finishedAt
			}),
			db
				.update(tasks)
				.set({
					status: 'succeeded',
					resultJson: JSON.stringify(merged),
					finishedAt,
					publishedAt: finishedAt
				})
				.where(eq(tasks.id, taskId))
		];

		await db.batch(statements as [any, ...any[]]);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await db
			.update(tasks)
			.set({
				status: 'failed',
				errorMessage: message,
				errorContextJson: JSON.stringify({ stage }),
				finishedAt: new Date().toISOString()
			})
			.where(eq(tasks.id, taskId));
	} finally {
		// Auto-start next queued task for the same date
		try {
			const nextQueued = await db
				.select({ id: tasks.id })
				.from(tasks)
				.where(and(eq(tasks.taskDate, taskDate), eq(tasks.status, 'queued')))
				.orderBy(tasks.createdAt)
				.limit(1);

			if (nextQueued.length > 0) {
				console.log(`[Queue] Starting next task: ${nextQueued[0].id}`);
				// Start next task (non-blocking, reuse current locals)
				runArticleGenerationTask(locals, nextQueued[0].id).catch((e) =>
					console.error('[Queue] Failed to start next task:', e)
				);
			}
		} catch (e) {
			console.error('[Queue] Error finding next queued task:', e);
		}
	}
}
