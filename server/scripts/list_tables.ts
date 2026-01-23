import { Database } from 'bun:sqlite';

const db = new Database('local.db');
const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);
db.close();
