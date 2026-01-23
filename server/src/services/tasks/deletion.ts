import { db } from '../../db/factory';
import type { AppKysely } from '../../db/factory';

/**
 * Service to handle cascading deletion of tasks and articles.
 * Ensures data consistency by cleaning up all related foreign key dependencies.
 */
export class DeletionService {
    /**
     * Delete a task and all its associated data (articles, vocab, highlights, etc.)
     * This performs a HARD delete within a transaction.
     */
    static async deleteTaskWithCascade(taskId: string) {
        await db.transaction().execute(async (trx) => {
            // 1. Find articles to get IDs for deep clean
            const articles = await trx.selectFrom('articles')
                .select('id')
                .where('generation_task_id', '=', taskId)
                .execute();

            const articleIds = articles.map(a => a.id);

            if (articleIds.length > 0) {
                // Deep clean article dependencies
                await DeletionService.deleteArticleDependencies(trx, articleIds);
                // Delete articles
                await trx.deleteFrom('articles').where('generation_task_id', '=', taskId).execute();
            }

            // 2. Delete the Task itself
            await trx.deleteFrom('tasks').where('id', '=', taskId).execute();
        });
    }

    /**
     * Delete a single article and its dependencies.
     * Does NOT delete the parent task, but ensures data consistency.
     */
    static async deleteArticleWithCascade(articleId: string) {
        await db.transaction().execute(async (trx) => {
            await DeletionService.deleteArticleDependencies(trx, [articleId]);
            await trx.deleteFrom('articles').where('id', '=', articleId).execute();
        });
    }

    /**
     * Helper to delete dependencies of a list of articles.
     * Used by both Task and Article deletion to avoid duplication.
     */
    private static async deleteArticleDependencies(trx: AppKysely, articleIds: string[]) {
        if (articleIds.length === 0) return;

        // 1. Highlights
        await trx.deleteFrom('highlights').where('article_id', 'in', articleIds).execute();

        // 2. Word Index
        await trx.deleteFrom('article_word_index').where('article_id', 'in', articleIds).execute();

        // 3. Variants
        await trx.deleteFrom('article_variants').where('article_id', 'in', articleIds).execute();

        // 4. Vocabulary & Definitions
        // Note: We explictly find and delete definitions to be safe, 
        // in case DB foreign keys are not set to CASCADE.
        const vocabs = await trx.selectFrom('article_vocabulary')
            .select('id')
            .where('article_id', 'in', articleIds)
            .execute();

        const vocabIds = vocabs.map(v => v.id);

        if (vocabIds.length > 0) {
            await trx.deleteFrom('article_vocab_definitions').where('vocab_id', 'in', vocabIds).execute();
        }

        await trx.deleteFrom('article_vocabulary').where('article_id', 'in', articleIds).execute();
    }
}
