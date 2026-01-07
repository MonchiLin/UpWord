
const fullText = "ROG and Kojima Productions Team Up\nASUS Republic of Gamers (ROG) marked two decades of pioneering contributions to the gaming industry with a significant announcement at CES 2026. The event featured a compelling update on their most recent collaborative ventures, prominently revealing a strategic alliance with Kojima Productions. Renowned for its visionary storytelling and singular artistry, Kojima Productions' involvement elevates this part.";

// Simulating AudioInit Logic
const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
const rawSentences = Array.from(segmenter.segment(fullText));

console.log(`Total Sentences: ${rawSentences.length}`);
rawSentences.forEach((s, i) => {
    console.log(`${i}: [Start: ${s.index}] ${s.segment.replace(/\n/g, '\\n')}`);
});

const target = "Kojima Productions makes great games.";
// The text I pasted above from Level 1 DB output doesn't seem to have "makes great games" part?
// DB output was: "Renowned for its visionary storytelling ... elevates this part"
// Wait, Level 1 DB output I saw in Step 143:
// "=== Level 3 === ... Kojima Productions makes great games. The partnership wil"
// Ah, Level 3 has it! Level 1 might differ.
// The user didn't specify Level. But usually Level 1 is default.
// Wait, looking at Step 143 output again carefully.

/*
=== Level 3 ===ort. Kojima Productions makes great games. The partnership wil
Target phrase "Kojima Productions makes great games." NOT found.
First 50 chars of remaining: [ The partnership will revolve around combining tec]
*/

// It says "Target phrase NOT found" but then prints context containing it?
// Ah, my script logic:
// const idx = content.indexOf(target);
// if (idx === -1) console.log("NOT found")
// else ...
// Why did it print context if not found?
// Step 143 output is messy. "Target phrase start index: 187" was for Level 1 or 2?
// It says "=== Level 2 ===" right after "187". So 187 was Level 1?
// But "Target phrase NOT found" appears under Level 2?

// Let's assume it IS found in the level the user is reading.
// If the user says "Kojima Productions makes great games.", that exists in Level 3 snippet.
// Level 3 snippet: "...ort. Kojima Productions makes great games. The partnership wil..."

const level3Text = "ROG Forges Groundbreaking Alliance with Kojima Productions at CES 2026\nROG works with Kojima Productions. This is a new collaborative effort. Kojima Productions makes great games. The partnership will revolve around combining technology with creative nature.";

console.log("\n--- Level 3 Simulation ---");
const rawSentences3 = Array.from(segmenter.segment(level3Text));
rawSentences3.forEach((s, i) => {
    console.log(`${i}: [Start: ${s.index}] ${s.segment.replace(/\n/g, '\\n')}`);
});
