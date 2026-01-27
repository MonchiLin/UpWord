import { db } from '../src/db/factory';

async function main() {
    console.log('Inspecting kysely_migration table...');
    try {
        const result = await db.selectFrom('kysely_migration' as any).selectAll().execute();
        console.log('Migrations:', result);
    } catch (e) {
        console.error('Error (table might not exist):', e);
    }
}

main();
