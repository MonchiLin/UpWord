
import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';

async function main() {
    console.log("Adding read_levels column to articles table...");
    try {
        await db.run(sql`ALTER TABLE articles ADD COLUMN read_levels INTEGER NOT NULL DEFAULT 0`);
        console.log("Successfully added read_levels column.");
    } catch (e: any) {
        if (e.message?.includes("duplicate column name")) {
            console.log("Column read_levels already exists.");
        } else {
            console.error("Migration failed:", e);
            process.exit(1);
        }
    }
}

main();
