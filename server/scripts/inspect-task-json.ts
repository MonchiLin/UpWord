import { Database } from 'bun:sqlite';
const db = new Database('local.db');

const row = db.query("SELECT structure_json FROM article_variants WHERE structure_json IS NOT NULL LIMIT 1").get() as { structure_json: string };

if (row && row.structure_json) {
    const data = JSON.parse(row.structure_json);
    console.log("Structure JSON Sample (Top Level Keys):", Object.keys(data));
    if (Array.isArray(data)) {
        console.log("It is an array of length:", data.length);
        if (data.length > 0) {
            console.log("First item keys:", Object.keys(data[0]));
            console.log("First item sample:", JSON.stringify(data[0], null, 2));
        }
    }
} else {
    console.log("No structure data found.");
}
