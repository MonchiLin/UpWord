
import * as cheerio from 'cheerio';
import type { GeminiStructureData } from '../src/services/llm/types';

/**
 * Injects Structure X-Ray Standoff Tags into original HTML using DOM manipulation.
 * 
 * **Algorithm (DOM-Aware Injection)**:
 * 1. Parses HTML into a DOM tree (Cheerio).
 * 2. Builds a flat "Text Map" linking every character in the plain text to its specific TextNode in the DOM.
 * 3. Uses the LLM's `extract` to find the exact start/end indices in the plain text (Robust Anchoring).
 * 4. Maps these indices back to specific TextNode(s).
 * 5. Splits the TextNodes at start/end boundaries if necessary.
 * 6. Wraps the target node(s) with `<span data-structure="...">`.
 * 
 * **Why this is better**:
 * - It is impossible to break HTML tags (e.g. `<b>wor` `ld</b>`) because we operate on Nodes, not Strings.
 * - It handles nested structures (e.g. Subject inside a Clause) naturally by nesting <span>s.
 * - It is robust against whitespace normalization differences between LLM and HTML.
 */
export function injectStructureSpans(htmlContent: string, structure: GeminiStructureData): string {
    if (!structure || structure.length === 0) return htmlContent;
    if (!htmlContent) return '';

    // 1. Load HTML into DOM
    // xmlMode: false helps preserve standard HTML behavior
    // decodeEntities: false prevents aggressive decoding that might mess up later.
    const $ = cheerio.load(htmlContent, { xmlMode: false }, false); // false = isDocument=false (fragment)

    // 2. Build Text Map (Plain Text -> DOM Nodes)
    interface TextNodeRef {
        node: any; // Cheerio Element (Text)
        startIndex: number;
        endIndex: number;
        text: string;
    }

    const textNodes: TextNodeRef[] = [];
    let fullPlainText = '';

    function traverse(node: any) {
        if (node.type === 'text') {
            const text = node.data || '';
            if (text.length > 0) {
                textNodes.push({
                    node: node,
                    startIndex: fullPlainText.length,
                    endIndex: fullPlainText.length + text.length,
                    text: text
                });
                fullPlainText += text;
            }
        } else if (node.children && node.children.length > 0) {
            node.children.forEach(traverse);
        }
    }

    // Start traversal from root
    $.root().contents().each((_, el) => traverse(el));

    // Sort structure by priority (start position)
    structure.sort((a, b) => a.start - b.start);

    // --- CHARACTER ARRAY APPROACH ---
    // 1. Create Char Map
    type CharInfo = {
        char: string;
        refNode: any;      // The original text node this char came from
        roles: Set<string>;
    };

    // Flatten all chars
    const charMap: CharInfo[] = [];
    for (const ref of textNodes) {
        for (let i = 0; i < ref.text.length; i++) {
            charMap.push({
                char: ref.text[i]!,
                refNode: ref.node,
                roles: new Set()
            });
        }
    }

    // 2. Apply Tags
    for (const item of structure) {
        // [Anchoring] Use 'extract' to verify/correct position
        let finalStart = item.start;
        let finalEnd = item.end;

        if (item.extract) {
            const claimed = fullPlainText.substring(item.start, item.end);
            // Simple robust check
            if (claimed !== item.extract) {
                // Fuzzy search nearby
                const searchWindow = 20;
                const areaStart = Math.max(0, item.start - searchWindow);
                const areaEnd = Math.min(fullPlainText.length, item.end + searchWindow);
                const area = fullPlainText.substring(areaStart, areaEnd);

                const foundIdx = area.indexOf(item.extract);
                if (foundIdx !== -1) {
                    finalStart = areaStart + foundIdx;
                    finalEnd = finalStart + item.extract.length;
                    // console.log(`[Structure] Auto-Corrected: ${item.role} @ ${item.start} -> ${finalStart}`);
                }
            }
        }

        // Loop range and add role to character
        for (let i = Math.max(0, finalStart); i < Math.min(finalEnd, charMap.length); i++) {
            charMap[i]!.roles.add(item.role);
        }
    }

    // 3. Reconstruct Nodes
    // Group by Original Node to avoid crossing element boundaries
    const nodesToUpdate = new Map<any, CharInfo[]>();
    for (const c of charMap) {
        if (!nodesToUpdate.has(c.refNode)) {
            nodesToUpdate.set(c.refNode, []);
        }
        nodesToUpdate.get(c.refNode)?.push(c);
    }

    // For each original text node...
    for (const [originalNode, chars] of nodesToUpdate) {
        let replacementHtml = '';
        let currentRoles: string = '___none___';
        let currentBuffer = '';

        const flush = () => {
            if (!currentBuffer) return;

            if (currentRoles === '___none___') {
                replacementHtml += currentBuffer;
            } else {
                // It has roles!
                // Support Nesting Logic
                const roleList = currentRoles.split('|').filter(r => r !== 'undefined');

                // Priority Order: Outer -> Inner
                const priority = ['rc', 'pas', 'con', 'pp', 's', 'v', 'o'];

                // Sort roles so that Outer ones appear first in the list
                roleList.sort((a, b) => {
                    const idxA = priority.indexOf(a) === -1 ? 99 : priority.indexOf(a);
                    const idxB = priority.indexOf(b) === -1 ? 99 : priority.indexOf(b);
                    return idxA - idxB;
                });

                // Construct nested spans: 
                // We iterate from Inner (last) to Outer (first) to wrap correctly?
                // Example: roles=['rc', 's'] (Subject inside RC)
                // We want: <span rc><span s>text</span></span>
                // So we start with text. Wrap with s. Wrap with rc.
                // Correct.

                let fragment = currentBuffer;

                // Iterate from right (Inner) to left (Outer)
                for (let i = roleList.length - 1; i >= 0; i--) {
                    const r = roleList[i];
                    fragment = `<span data-structure="${r}">` + fragment + `</span>`;
                }

                replacementHtml += fragment;
            }

            currentBuffer = '';
        };

        for (const c of chars) {
            const signature = Array.from(c.roles).sort().join('|') || '___none___';

            if (signature !== currentRoles) {
                flush();
                currentRoles = signature;
            }
            currentBuffer += c.char;
        }
        flush();

        // Replace original node with new HTML string
        $(originalNode).replaceWith(replacementHtml);
    }

    return $.html();
}
