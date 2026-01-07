/**
 * Debug Script: Test D1 proxy directly to understand row mapping
 */
import { db } from '../src/db/client';
import { sql } from 'drizzle-orm';
import { articleVariants } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const articleId = 'c6cb696e-3aee-4a98-9ea0-0cdb11ef109c';

async function testQuery() {
    console.log('=== Testing Raw SQL Query ===');
    const rawResults = await db.all(sql`
        SELECT id, article_id, level, content 
        FROM article_variants 
        WHERE article_id = ${articleId} AND level = 1
        LIMIT 1
    `) as any[];

    console.log('Raw SQL result:', JSON.stringify(rawResults[0], null, 2));
    console.log('Raw result keys:', rawResults[0] ? Object.keys(rawResults[0]) : 'NO DATA');

    console.log('\n=== Testing Drizzle Query ===');
    const drizzleResults = await db.select()
        .from(articleVariants)
        .where(and(
            eq(articleVariants.articleId, articleId),
            eq(articleVariants.level, 1)
        ))
        .limit(1);

    console.log('Drizzle result:', JSON.stringify(drizzleResults[0], null, 2));
    console.log('Drizzle result keys:', drizzleResults[0] ? Object.keys(drizzleResults[0]) : 'NO DATA');
    console.log('Content value:', drizzleResults[0]?.content);
}

testQuery().catch(console.error);
