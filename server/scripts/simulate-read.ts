
import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { articles } from '../db/schema';

async function main() {
    // 1. Pick an article
    const rows = await db.select().from(articles).limit(1);
    if (rows.length === 0) {
        console.error("No articles found.");
        return;
    }
    const article = rows[0];
    console.log(`Testing Article: ${article.id} (${article.title})`);
    console.log(`Current Read Levels: ${article.readLevels}`);

    // 2. Simulate Reading Level 2 (Mask 3 -> 011)
    const levelToRead = 2;
    console.log(`\nSimulating read for Level ${levelToRead}...`);

    // Call API logic directly (since we can't fetch localhost easily in script without server running, we simulate DB update)
    // PATCH /api/articles/:id/read
    const mask = (1 << levelToRead) - 1; // (1<<2)-1 = 3

    await db.run(sql`
        UPDATE articles 
        SET read_levels = (read_levels | ${mask})
        WHERE id = ${article.id}
    `);

    // 3. Verify
    const updatedRows = await db.select().from(articles).where(sql`id = ${article.id}`);
    const updated = updatedRows[0];
    console.log(`Updated Read Levels: ${updated.readLevels}`);

    const expectedMask = (article.readLevels | mask);
    if (updated.readLevels === expectedMask) {
        console.log(`✅ Success! Level ${levelToRead} marked. (Mask: ${mask})`);
    } else {
        console.error(`❌ Failed. Expected ${expectedMask}, Got ${updated.readLevels}`);
    }

    // 4. Restore (Optional)
    // await db.update(articles).set({ readLevels: article.readLevels }).where(sql`id = ${article.id}`);
    console.log("Note: Database modified. You may want to reset if testing.");
}

main().catch(console.error);
