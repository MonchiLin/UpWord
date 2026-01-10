import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // 1. Add 'llm' column to 'tasks'
    await db.schema
        .alterTable('tasks')
        .addColumn('llm', 'text')
        .execute();

    // 2. Drop the leftover table from failed migrations
    await db.schema
        .dropTable('__new_article_variants')
        .ifExists()
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    // 1. Remove 'llm' column
    await db.schema
        .alterTable('tasks')
        .dropColumn('llm')
        .execute();

    // 2. Restore the leftover table? No, we don't restore garbage.
}
