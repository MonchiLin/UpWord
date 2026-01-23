
import { db } from '../src/db/factory';
import { sql } from 'kysely';

async function checkRecentArticles() {
    try {
        // Select raw content to debug JSON issues
        const results = await db
            .selectFrom('article_variants')
            .select([
                'id',
                'created_at',
                'content'
            ])
            .orderBy('created_at', 'desc')
            .limit(5)
            .execute();

        console.log("Recent Articles Raw Data Check:");

        for (const r of results) {
            console.log(`\n--- ID: ${r.id} (${r.created_at}) ---`);

            let contentToPrint: any = r.content;

            // If content is already an object (Kysely ParseJSONResultsPlugin), check fields directly
            if (typeof r.content === 'object' && r.content !== null) {
                console.log("Type: Object (Parsed)");
                console.log("pull_quote:", (r.content as any).pull_quote);
                console.log("summary:", (r.content as any).summary);
                // Print a snippet of the json string
                console.log("Snippet:", JSON.stringify(r.content).substring(0, 200));
            } else {
                console.log("Type:", typeof r.content);
                console.log("Snippet:", String(r.content).substring(0, 200));
                // Try parsing if string
                if (typeof r.content === 'string') {
                    try {
                        const parsed = JSON.parse(r.content);
                        console.log("Manual Parse: OK");
                        console.log("pull_quote:", parsed.pull_quote);
                        console.log("summary:", parsed.summary);
                    } catch (e) {
                        console.error("Manual Parse: FAIL");
                    }
                }
            }
        }

    } catch (error) {
        console.error("Error querying database:", error);
    }
}

checkRecentArticles();
