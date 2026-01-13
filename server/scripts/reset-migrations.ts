import { db } from '../src/db/factory';
import { sql } from 'kysely';

async function resetMigrations() {
    console.log('Resetting migration history...');

    try {
        await sql`DROP TABLE IF EXISTS kysely_migration`.execute(db);
        await sql`DROP TABLE IF EXISTS kysely_migration_lock`.execute(db);
        console.log('✅ Migration history reset successfully.');
    } catch (error) {
        console.error('❌ Failed to reset migration history:', error);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

resetMigrations();
