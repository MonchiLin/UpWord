
import { db } from '../src/db/client';
import { articles } from '../db/schema'; // Ensure correct path
import { eq } from 'drizzle-orm';

const ARTICLE_ID = 'c6cb696e-3aee-4a98-9ea0-0cdb11ef109c';

async function inspectContent() {
    console.log(`Inspecting content for article: ${ARTICLE_ID}`);
    try {
        const article = await db.select().from(articles).where(eq(articles.id, ARTICLE_ID)).get();

        if (!article) {
            console.error('Article not found!');
            return;
        }

        // Check if content_json exists (not part of current Drizzle schema but might be in raw DB result)
        // Access raw property if schema definition is missing it but DB has it
        // Or if 'articles' table in schema actually matches DB.

        // In the schema file viewed, 'articles' table DOES NOT have 'content_json'.
        // It has 'generationTaskId' which links to 'tasks'. 'tasks' table has 'resultJson'.
        // Let's check the tasks table instead.

        console.log(`Article found. Generation Task ID: ${article.generationTaskId}`);

        // We'll trust the user's implicit direction that data is somewhere.
        // Based on schema, article content is likely in 'article_variants' OR 'tasks.result_json'

    } catch (e) {
        console.error('Error inspecting content:', e);
    }
}
