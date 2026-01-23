import { db } from '../src/db/factory';
import { DeletionService } from '../src/services/tasks/deletion';

async function verify() {
    console.log("Starting Deletion Logic Verification...");

    // --- 1. Setup Data for Task Deletion ---
    console.log("\n[1] Setting up Mock Data (Task A)...");
    const taskAId = crypto.randomUUID();
    const articleAId = crypto.randomUUID();

    // Create Profile if needed (just grab first)
    const profile = await db.selectFrom('generation_profiles').selectAll().limit(1).executeTakeFirst();
    let profileId = profile?.id;
    if (!profileId) {
        profileId = crypto.randomUUID();
        await db.insertInto('generation_profiles').values({ id: profileId, name: 'Test' }).execute();
    }

    // Insert Task
    await db.insertInto('tasks').values({
        id: taskAId,
        task_date: '2099-01-01',
        type: 'article_generation',
        status: 'succeeded',
        profile_id: profileId,
        version: 0,
        mode: 'rss'
    }).execute();

    // Insert Article
    await db.insertInto('articles').values({
        id: articleAId,
        generation_task_id: taskAId,
        model: 'test',
        variant: 1,
        title: 'Test Article A',
        status: 'published'
    }).execute();

    // Insert Highlight
    await db.insertInto('highlights').values({
        id: crypto.randomUUID(),
        article_id: articleAId,
        actor: 'debug',
        text: 'Test Highlight',
        start_meta_json: JSON.stringify({}),
        end_meta_json: JSON.stringify({})
    }).execute();

    // --- 2. Verify Task Deletion ---
    console.log("[2] Deleting Task A...");
    await DeletionService.deleteTaskWithCascade(taskAId);

    const taskACheck = await db.selectFrom('tasks').selectAll().where('id', '=', taskAId).execute();
    const articleACheck = await db.selectFrom('articles').selectAll().where('generation_task_id', '=', taskAId).execute();
    const highlightACheck = await db.selectFrom('highlights').selectAll().where('article_id', '=', articleAId).execute();

    if (taskACheck.length === 0 && articleACheck.length === 0 && highlightACheck.length === 0) {
        console.log("✅ Task Deletion Success: All data cleaned up.");
    } else {
        console.error("❌ Task Deletion Failed:", {
            task: taskACheck.length,
            article: articleACheck.length,
            highlight: highlightACheck.length
        });
    }

    // --- 3. Setup Data for Article Deletion ---
    console.log("\n[3] Setting up Mock Data (Task B)...");
    const taskBId = crypto.randomUUID();
    const articleBId = crypto.randomUUID();

    await db.insertInto('tasks').values({
        id: taskBId,
        task_date: '2099-01-02',
        type: 'article_generation',
        status: 'succeeded',
        profile_id: profileId,
        version: 0,
        mode: 'rss'
    }).execute();

    await db.insertInto('articles').values({
        id: articleBId,
        generation_task_id: taskBId,
        model: 'test',
        variant: 1,
        title: 'Test Article B',
        status: 'published'
    }).execute();

    // --- 4. Verify Article Deletion ---
    console.log("[4] Deleting Article B...");
    await DeletionService.deleteArticleWithCascade(articleBId);

    const taskBCheck = await db.selectFrom('tasks').selectAll().where('id', '=', taskBId).execute();
    const articleBCheck = await db.selectFrom('articles').selectAll().where('id', '=', articleBId).execute();

    if (taskBCheck.length === 1 && articleBCheck.length === 0) {
        console.log("✅ Article Deletion Success: Article deleted, Task REMAINED (as expected).");
    } else {
        console.error("❌ Article Deletion Failed:", {
            task: taskBCheck.length, // Should be 1
            article: articleBCheck.length // Should be 0
        });
    }

    console.log("\nVerification Complete.");
}

verify().catch(console.error);
