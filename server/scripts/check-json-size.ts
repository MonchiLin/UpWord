import { Database } from 'bun:sqlite';
const db = new Database('local.db');

const rows = db.query("SELECT id, length(result_json) as len FROM tasks WHERE result_json IS NOT NULL ORDER BY len DESC LIMIT 10").all() as { id: string, len: number }[];

console.log("Top 10 largest result_json:");
rows.forEach(r => console.log(`${r.id}: ${r.len} bytes`));
