/**
 * Fix Article Index Script
 * 
 * 1. Removes "ghost" index records pointing to deleted articles.
 * 2. Scans all valid articles and re-indexes them.
 * 
 * Usage: bun run scripts/fix-article-index.ts
 */
import { db } from '../src/db/client';
import { sql } from 'drizzle-orm';
import { indexArticleWords } from '../src/services/wordIndexer';
import { articleWordIndex } from '../db/schema';

async function fixArticleIndex() {
    console.log('🔧 Starting Article Index Repair...');

    // 1. Clean Ghost Records
    console.log('\nStep 1: Cleaning ghost records...');
    const result = await db.run(sql`
        DELETE FROM article_word_index 
        WHERE article_id NOT IN (SELECT id FROM articles)
    `);
    // Note: Drizzle's run() return type varies by driver, often doesn't give row count easily in raw mode without PRAGMA
    // So we just log completion.
    console.log('✅ Ghost records removed.');

    // 2. Get Valid Articles
    console.log('\nStep 2: Fetching valid articles...');
    const articles = await db.all(sql`
        SELECT a.id, a.generation_task_id, t.task_date, t.result_json 
        FROM articles a
        LEFT JOIN tasks t ON a.generation_task_id = t.id
    `) as { id: string; generation_task_id: string; task_date: string; result_json: string }[];

    console.log(`Found ${articles.length} articles to check.`);

    // 3. Re-index Loop
    console.log('\nStep 3: Re-indexing content...');

    for (const article of articles) {
        if (!article.task_date) {
            console.warn(`⚠️  Article ${article.id} has no task_date (Task ${article.generation_task_id}), skipping.`);
            continue;
        }

        console.log(`Processing Article: ${article.id} (${article.task_date})`);

        // A. Get Daily Words (New / Review)
        const dailyRefs = await db.all(sql`
            SELECT word, type FROM daily_word_references WHERE date = ${article.task_date}
        `) as { word: string; type: 'new' | 'review' }[];

        const newWords = dailyRefs.filter(d => d.type === 'new').map(d => d.word);
        const reviewWords = dailyRefs.filter(d => d.type === 'review').map(d => d.word);

        // B. Get Selected Words from Task Result
        let selectedWords: string[] = [];
        try {
            if (article.result_json) {
                const parsed = JSON.parse(article.result_json);
                if (Array.isArray(parsed.selected_words)) {
                    selectedWords = parsed.selected_words;
                }
            }
        } catch (e) {
            console.warn(`   Failed to parse task result JSON for article ${article.id}`);
        }

        // C. Get Article Content (Variants)
        const variants = await db.all(sql`
            SELECT content, level FROM article_variants WHERE article_id = ${article.id}
        `) as { content: string; level: number }[];

        if (variants.length === 0) {
            console.warn(`   No content variants found for article ${article.id}, skipping.`);
            continue;
        }

        // D. Construct ContentJson for Indexer
        // wordIndexer expects { input_words: { selected, new, review }, result: { articles: [...] } }
        const contentJson = {
            input_words: {
                selected: selectedWords,
                new: newWords,
                review: reviewWords
            },
            result: {
                articles: variants.map(v => ({
                    content: v.content,
                    word_count: v.content.split(/\s+/).length // rough count
                }))
            }
        };

        // E. Run Indexer
        try {
            await indexArticleWords(article.id, contentJson);
        } catch (e) {
            console.error(`   ❌ Failed to index article ${article.id}:`, e);
        }
    }

    console.log('\n🎉 Repair Complete!');
}

fixArticleIndex().catch(console.error);
