import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('generation_profiles')
        .addColumn('target_word_count', 'integer', (col) => col.defaultTo(10).notNull())
        .execute();

    await db.schema
        .alterTable('generation_profiles')
        .addColumn('impression_source', 'text', (col) => col.defaultTo('random').notNull())
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('generation_profiles')
        .dropColumn('target_word_count')
        .execute();

    await db.schema
        .alterTable('generation_profiles')
        .dropColumn('impression_source')
        .execute();
}
