import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    // SQLite doesn't support changing nullability of a column directly.
    // We must rebuild the table.

    // 1. Create new table with intended schema
    await db.schema
        .createTable('tasks_new')
        .addColumn('id', 'text', (col) => col.primaryKey().notNull())
        .addColumn('task_date', 'text', (col) => col.notNull())
        .addColumn('type', 'text', (col) => col.notNull())
        .addColumn('trigger_source', 'text', (col) => col.defaultTo('manual').notNull())
        .addColumn('status', 'text', (col) => col.notNull())
        .addColumn('llm', 'text')
        .addColumn('profile_id', 'text') // <--- NOW NULLABLE
        .addColumn('mode', 'text', (col) => col.defaultTo('rss').notNull()) // <--- NOW NOT NULL
        .addColumn('version', 'integer', (col) => col.defaultTo(0).notNull())
        .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('started_at', 'text')
        .addColumn('finished_at', 'text')
        .addColumn('published_at', 'text')
        .addColumn('locked_until', 'text')
        .addColumn('context_json', 'text')
        .addColumn('error_message', 'text')
        .addColumn('error_context_json', 'text')

        .addCheckConstraint('chk_tasks_type_enum', sql`type IN ('article_generation')`)
        .addCheckConstraint('chk_tasks_trigger_source_enum', sql`trigger_source IN ('manual', 'cron')`)
        .addCheckConstraint('chk_tasks_status_enum', sql`status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')`)
        .addCheckConstraint('chk_tasks_published_only_for_article_generation', sql`type = 'article_generation' OR published_at IS NULL`)
        .execute();

    // 2. Copy data
    // Note: We use COALESCE for mode to ensure it's not null
    await sql`
        INSERT INTO tasks_new (
            id, task_date, type, trigger_source, status, llm, profile_id, 
            mode, version, created_at, started_at, finished_at, published_at, 
            locked_until, context_json, error_message, error_context_json
        )
        SELECT 
            id, task_date, type, trigger_source, status, llm, profile_id, 
            COALESCE(mode, 'rss'), version, created_at, started_at, finished_at, published_at, 
            locked_until, context_json, error_message, error_context_json
        FROM tasks
    `.execute(db);

    // 3. Drop old table
    await db.schema.dropTable('tasks').execute();

    // 4. Rename new table
    await db.schema.alterTable('tasks_new').renameTo('tasks').execute();

    // 5. Recreate Indices
    await db.schema.createIndex('idx_tasks_task_date').on('tasks').column('task_date').execute();
    await db.schema.createIndex('idx_tasks_type').on('tasks').column('type').execute();
    await db.schema.createIndex('idx_tasks_status').on('tasks').column('status').execute();
    await db.schema.createIndex('idx_tasks_profile_id').on('tasks').column('profile_id').execute();
    await db.schema.createIndex('idx_tasks_published_at').on('tasks').column('published_at').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    // Revert is complex (cannot make nullable back to not null easily without data loss risk)
    // We assume down is not strictly required for this forward-fix.
    // But implementation would be similar: create table with NOT NULL profile_id, copy (filter NULLs?), drop.
}
