import { parseInlineTags, validateParseResult } from '../src/services/llm/parseInlineTags';

const originalText = "The quick brown fox jumps over the lazy dog.";

console.log("=== Testing Strict Validation ===\n");

// case 1: Exact match
console.log("Case 1: Exact match with tags");
const input1 = "<S>The quick brown fox</S> <V>jumps</V> <PP>over the lazy dog</PP>.";
const result1 = parseInlineTags(input1);
const val1 = validateParseResult(result1, originalText);
console.log("Result:", val1.valid ? "✅ Valid" : "❌ Invalid");
if (!val1.valid) console.log("Errors:", val1.errors);
console.log();

// Case 2: Whitespace difference (should be valid)
console.log("Case 2: Whitespace difference (extra newline)");
const input2 = "<S>The quick brown fox</S>\n<V>jumps</V> <PP>over the lazy dog</PP>.  ";
const result2 = parseInlineTags(input2);
const val2 = validateParseResult(result2, originalText);
console.log("Result:", val2.valid ? "✅ Valid (Normalized)" : "❌ Invalid");
if (!val2.valid) console.log("Errors:", val2.errors);
console.log();

// Case 4: Chinese whitespace insertion (should be valid now)
console.log("Case 4: Chinese whitespace insertion");
const originalText4 = "《每日经济新闻》发布了一份报告。它谈论了2026年的市场";
const input4 = "<S>《每日经济新闻》</S> <V>发布了</V> 一份报告。它 <V>谈论了</V> 2026年的市场";
const result4 = parseInlineTags(input4);
const val4 = validateParseResult(result4, originalText4);
console.log("Result:", val4.valid ? "✅ Valid (Normalized Chinese Spaces)" : "❌ Invalid");
if (!val4.valid) console.log("Errors:", val4.errors);
console.log();

// Case 5: Unclosed tags (should be valid now if text is preserved)
console.log("Case 5: Unclosed tags");
const originalText5 = "believed in working for a cure. However,";
const input5 = "believed in working <PP>for <O>a cure</O>. However,";
const result5 = parseInlineTags(input5);
const val5 = validateParseResult(result5, originalText5);
console.log("Result:", val5.valid ? "✅ Valid (Ignored Unclosed <PP>)" : "❌ Invalid");
if (!val5.valid) console.log("Errors:", val5.errors);
console.log();
