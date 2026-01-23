
import { db } from '../src/db/factory';
import { sql } from 'kysely';

async function checkRecentArticles() {
    try {
        // 3. New Columns Check
        const results = await db
            .selectFrom('article_variants')
            .select(['title', 'level', 'created_at', 'pull_quote', 'summary'])
            .orderBy('created_at', 'desc')
            .limit(5)
            .execute();

        console.log("\nRecent 5 Entries:");
        console.table(results);

        // 4. Check Paragraph Count for the specific article
        const targetTitle = "Self-Deportation and a Missing Trial in a $100 Million Jewelry Heist";
        const article = await db
            .selectFrom('article_variants')
            .select(['content', 'level'])
            .where('title', '=', targetTitle)
            .where('level', '=', 2) // Check intermediate level
            .executeTakeFirst();

        if (article && article.content) {
            const paragraphs = article.content.split(/\n\s*\n/);
            console.log(`\nArticle "${targetTitle}" (Level 2):`);
            console.log(`Paragraph Count: ${paragraphs.length}`);
            console.log(`Content Preview: ${article.content.substring(0, 100)}...`);
        } else {
            console.log("\nTarget article not found.");
        }

    } catch (error) {
        console.error("Error asking database:", error);
    }
}

checkRecentArticles();
