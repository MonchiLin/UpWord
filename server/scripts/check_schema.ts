import { db } from '../src/db/factory';

async function main() {
    console.log('Inspecting tasks table...');
    try {
        const result = await db.executeQuery({
            sql: `PRAGMA table_info(tasks)`,
            parameters: [],
            query: { kind: 'Raw', sql: `PRAGMA table_info(tasks)`, parameters: [] }
        });
        console.log('Columns:', result.rows);
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
