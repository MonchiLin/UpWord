
import { injectStructureSpans } from '../lib/structure-injector';
import { expect, test } from 'bun:test';

// Mock Data
const htmlInput = `<p>The quick <b>brown</b> fox jumps.</p>`;
const structureData = [
    { start: 0, end: 19, role: 's', extract: 'The quick brown fox' }, // Subject matches mixed content
    { start: 4, end: 9, role: 'adj', extract: 'quick' }, // Nested adjective (custom role for test)
    { start: 20, end: 25, role: 'v', extract: 'jumps' } // Verb
];

console.log("--- Test 1: Mixed Content & Nesting ---");
const result1 = injectStructureSpans(htmlInput, structureData as any);
console.log("Input:", htmlInput);
console.log("Output:", result1);

// Visual Check expectation:
// <p><span s>The <span adj>quick</span> <b><span s>brown</span></b> fox</span> <span v>jumps</span>.</p>
// Note: The logic might produce slightly different nesting depending on how it splits 'brown' inside <b>.
// The key is: The text "brown" inside <b> should be wrapped in 's' structure.

// Test 2: Offset fuzzy match
const htmlInput2 = `<div>Hello World</div>`;
const struct2 = [
    { start: 0, end: 5, role: 'greeting', extract: 'Hello' } // Matches "Hello"
];
console.log("\n--- Test 2: Simple ---");
console.log(injectStructureSpans(htmlInput2, struct2 as any));

// Test 3: Auto-correction
const htmlInput3 = `<div>Offset Drift Test</div>`;
// LLM says "Drift" is at 10-15, but actual text "Offset Drift Test" -> "Drift" is at 7-12.
const struct3 = [
    { start: 10, end: 15, role: 'error', extract: 'Drift' }
];
console.log("\n--- Test 3: Auto-Correction ---");
console.log(injectStructureSpans(htmlInput3, struct3 as any));
