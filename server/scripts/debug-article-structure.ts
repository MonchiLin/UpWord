
import { db } from '../src/db/client';
import { articleVariants } from '../db/schema';
import { eq } from 'drizzle-orm';

async function run() {
    const inputId = process.argv[2];
    if (!inputId) {
        console.error('Please provide an Article ID or Variant ID');
        return;
    }
    console.log(`Fetching variants for ID ${inputId}...`);

    let variants = await db.select().from(articleVariants).where(eq(articleVariants.articleId, inputId));

    if (variants.length === 0) {
        // Try as Variant ID
        variants = await db.select().from(articleVariants).where(eq(articleVariants.id, inputId));
    }

    if (variants.length === 0) {
        console.error('No variants found for this ID');
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
