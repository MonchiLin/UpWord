
import { db } from '../src/db/client';
import { articleVariants } from '../db/schema';
import { eq } from 'drizzle-orm';

async function run() {
    const id = 'd5f77f1d-196f-4c52-82d6-a1a15827284d';
    console.log(`Fetching variants for article ${id}...`);

    const variants = await db.select().from(articleVariants).where(eq(articleVariants.articleId, id));

    if (variants.length === 0) {
        console.error('No variants found for this article');
        return;
    }

    console.log(`Found ${variants.length} variants.`);

    for (const v of variants) {
        console.log(`\n--- Level ${v.level} (${v.levelLabel}) ---`);
        if (!v.structureJson) {
            console.log('No structure data.');
            continue;
        }

        try {
            const structure = JSON.parse(v.structureJson);
            // Print a sample or specific overlapping sections
            // Let's print the whole thing if it's not too huge, or filter
            console.log(JSON.stringify(structure, null, 2));
        } catch (e) {
            console.error('Failed to parse structure JSON', e);
        }
    }
}

run().catch(console.error);
