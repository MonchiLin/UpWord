import { Elysia } from 'elysia';
import { sql } from 'kysely';
import { db } from '../src/db/factory';
import { DeletionService } from '../src/services/tasks/deletion';
import { toCamelCase } from '../src/utils/casing';
import { AppError } from '../src/errors/AppError';

/**
 * [文章资源控制器]
 * ------------------------------------------------------------------
 * 功能：处理文章 (Article) 及其衍生资源 (Variants, Vocabulary) 的 CRUD 操作。
 *
 * 核心职责：
 * - 数据重组 (Hydration)：将 DB 中拆散存储的 Article/Variants/Vocab重新组装为前端所需的聚合 JSON 对象。
 * - 进度追踪：使用位掩码 (Bitmask) 高效存储用户的阅读进度 (read_levels)。
 * - 级联删除：调用 DeletionService 清理文章本身及其关联的所有生成产物。
 *
 * 业务语境：
 * - 前端展示组件 (`ImpressionArticle.tsx`) 强依赖此处的 `content_json` 聚合结构，修改需同步。
 */
export const articlesRoutes = new Elysia({ prefix: '/api/articles' })
    .get('/lookup', async ({ query: { date, slug } }) => {
        if (!date || !slug) throw AppError.badRequest('Missing date or slug');

        const articleRow = await db.selectFrom('articles')
            .innerJoin('tasks', 'articles.generation_task_id', 'tasks.id')
            .select('articles.id')
            .where('tasks.task_date', '=', date)
            .where('articles.slug', '=', slug)
            .limit(1)
            .executeTakeFirst();

        if (!articleRow) throw AppError.notFound();
        return getArticleDetails(articleRow.id);
    })
    .get('/:id', async ({ params: { id } }) => {
        return getArticleDetails(id);
    })
    .patch('/:id/read', async ({ params: { id }, body }) => {
        const { level } = body as { level: number };
        if (level === undefined) return { status: "error", message: "level required" };

        // Bitmask Logic: Cumulative Read Status
        // Sets all levels up to 'level' as read.
        // E.g. Level 2 (Binary 10) -> Mask (1<<2)-1 = 3 (Binary 011) -> Levels 1 & 2 marked read.
        const mask = (1 << level) - 1;

        await db.updateTable('articles')
            .set({
                read_levels: sql`read_levels | ${mask}`
            })
            .where('id', '=', id)
            .execute();

        return { status: "ok" };
    })
    .delete('/:id', async ({ params: { id } }) => {
        await DeletionService.deleteArticleWithCascade(id);
        return { status: "ok" };
    });

// Data Aggregation Helper
// Reconstructs the complex 'content_json' structure from relational tables.
async function getArticleDetails(id: string) {
    const article = await db.selectFrom('articles')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

    if (!article) throw AppError.notFound();

    let task = null;
    if (article.generation_task_id) {
        task = await db.selectFrom('tasks')
            .leftJoin('generation_profiles', 'tasks.profile_id', 'generation_profiles.id')
            .selectAll('tasks')
            .select('generation_profiles.name as profileName')
            .where('tasks.id', '=', article.generation_task_id)
            .executeTakeFirst();
    }

    const variants = await db.selectFrom('article_variants')
        .select(['level', 'level_label', 'title', 'content', 'pull_quote', 'summary', 'syntax_json', 'sentences_json'])
        .where('article_id', '=', id)
        .orderBy('level', 'asc')
        .execute();

    const vocabRows = await db.selectFrom('article_vocabulary')
        .leftJoin('article_vocab_definitions', 'article_vocabulary.id', 'article_vocab_definitions.vocab_id')
        .select([
            'article_vocabulary.id as vocab_id',
            'article_vocabulary.word',
            'article_vocabulary.phonetic',
            'article_vocab_definitions.part_of_speech',
            'article_vocab_definitions.definition'
        ])
        .where('article_vocabulary.article_id', '=', id)
        .execute();

    const vocabMap = new Map<string, any>();
    for (const row of vocabRows) {
        if (!vocabMap.has(row.vocab_id)) {
            vocabMap.set(row.vocab_id, {
                word: row.word,
                phonetic: row.phonetic,
                definitions: []
            });
        }
        if (row.part_of_speech && row.definition) {
            vocabMap.get(row.vocab_id).definitions.push({
                pos: row.part_of_speech,
                definition: row.definition
            });
        }
    }
    const wordDefinitions = Array.from(vocabMap.values());

    let content_json_reconstructed = null;

    if (variants.length > 0) {
        const reconstructed = {
            result: {
                title: article.title,
                sources: article.source_url ? [article.source_url] : [],
                articles: variants.map(v => ({
                    level: v.level,
                    level_label: v.level_label,
                    title: v.title,
                    content: v.content,
                    pull_quote: v.pull_quote, // [NEW]
                    summary: v.summary,       // [NEW]
                    syntax: v.syntax_json || [],
                    sentences: v.sentences_json || []
                })),
                word_definitions: wordDefinitions
            }
        };
        content_json_reconstructed = JSON.stringify(toCamelCase(reconstructed));
    }

    // Legacy Compatibility: Reconstruct 'contentJson' for frontend consumers.
    // The frontend expects a single JSON blob containing title, variants, and definitions.

    const camelArticle = toCamelCase(article) as Record<string, any>;

    const generationMode = task?.mode === 'impression' ? 'impression' : 'rss';

    return {
        articles: {
            ...camelArticle,
            contentJson: content_json_reconstructed
        },
        tasks: toCamelCase(task),
        generationMode,
    };
}
