
import { injectStructureSpans } from '../../src/lib/structure/injector';

// Mock structure data based on the issue (Nested cmp > ger)
// "on advancing the frontiers..."
// cmp: 0-49 ("on advancing the frontiers of accessible robotics")
// ger: 3-12 ("advancing")

// Note: "on " is length 3. "advancing" starts at 3.
const text = "on advancing the frontiers of accessible robotics";
// 01234567890123456789012345678901234567890123456789
// on advancing ...
// cmp: 0-49
// ger: 3-12

const structure = [
    { role: 'cmp', start: 0, end: 49 },
    { role: 'ger', start: 3, end: 12 }
];

console.log('--- Test: Nested Structure Injection ---');
console.log('Text:', text);
console.log('Structure:', JSON.stringify(structure));

const html = `<p>${text}</p>`;
const result = injectStructureSpans(html, structure as any);

console.log('\n--- Result HTML ---');
console.log(result);

// Check if nested
if (result.includes('data-structure="cmp"><span data-structure="ger">')) {
    console.log('\n✅ SUCCESS: Direct nesting found!');
} else if (result.includes('data-structure="cmp">on <span data-structure="ger">')) {
    console.log('\n✅ SUCCESS: Nesting with text prefix found!');
} else {
    console.log('\n❌ FAILURE: Nesting not found. Likely fragmented.');
}
