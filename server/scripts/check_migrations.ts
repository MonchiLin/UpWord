import { db } from '../src/db/factory';
import { FileMigrationProvider, Migrator } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';

async function main() {
    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({
            fs,
            path,
            migrationFolder: path.join(__dirname, '../src/db/migrations'),
        }),
    });

    const { error, results } = await migrator.getMigrations();

    results?.forEach((it) => {
        console.log(`${it.name}: ${it.status}`);
    });

    if (error) {
        console.error('Migration Error:', error);
    }
}

main();
