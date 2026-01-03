/**
 * Feature: Structure Reveal Interaction
 * 
 * Manages user interactions for the "Structure" feature (formerly X-Ray).
 * 
 * **Behaviors**:
 * 1. **Click-to-Focus**:
 *    - Clicking a sentence token (`.s-token`) activates the `structure-active` state for ALL tokens in that sentence.
 *    - Strict single-sentence focus (clears previous).
 *    - Clicking outside the article clears focus.
 * 2. **Unified Hover**:
 *    - Hovering any token in a sentence highlights the entire sentence (`.sentence-hover`).
 * 3. **Keyboard**:
 *    - Escape key clears focus.
 * 
 * **Architecture**:
 * - Uses **Event Delegation** on `document` to avoid attaching thousands of listeners to individual tokens.
 * - Initialization is idempotent via `data-structure-init` attribute on body.
 */

import { positionStructureLabels, clearLabels } from './labelPositioner';

export function initStructureInteraction() {
    if (typeof document === 'undefined') return;

    const ATTR_INIT = 'data-structure-init';
    const CLASS_ACTIVE = 'structure-active';
    const CLASS_HOVER = 'sentence-hover';
    const SELECTOR_TOKEN = '.s-token';
    const SELECTOR_CONTAINER = '#article-content';

    // Idempotency Check: Prevent duplicate initialization
    if (document.body.hasAttribute(ATTR_INIT)) return;
    document.body.setAttribute(ATTR_INIT, 'true');

    console.log('[Structure] Initializing Interaction Protocol...');

    // --- Click Delegation ---
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;

        // 1. Context Check: Inside Article?
        const articleContainer = target.closest(SELECTOR_CONTAINER);

        // Case A: Click OUTSIDE (Dismiss)
        if (!articleContainer) {
            clearAllActive(CLASS_ACTIVE);
            return;
        }

        // Case B: Click INSIDE
        const token = target.closest(SELECTOR_TOKEN);

        // Case B.1: Clicked a Token (Activate)
        if (token instanceof HTMLElement) {
            const sid = token.dataset.sid;
            if (sid) {
                // Strategy: Always Clear Others -> Activate Target
                clearAllActive(CLASS_ACTIVE);
                clearLabels();
                activateSentence(sid, CLASS_ACTIVE);

                // Position labels after DOM update
                requestAnimationFrame(() => {
                    const articleContainer = document.querySelector(SELECTOR_CONTAINER) as HTMLElement;
                    if (articleContainer) {
                        positionStructureLabels(articleContainer);
                    }
                });
                return;
            }
        }

        // Case B.2: Clicked whitespace inside article (Dismiss)
        clearAllActive(CLASS_ACTIVE);
        clearLabels();
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearAllActive(CLASS_ACTIVE);
            clearLabels();
        }
    });

    // --- Hover Delegation (Unified Highlight) ---
    // Note: 'mouseover' bubbles, providing a delegation target.
    document.addEventListener('mouseover', (e) => {
        const target = e.target;
        if (target instanceof HTMLElement) {
            const token = target.closest(SELECTOR_TOKEN);
            if (token instanceof HTMLElement) {
                const sid = token.dataset.sid;
                if (sid) {
                    toggleSentenceClass(sid, CLASS_HOVER, true);
                }
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target;
        if (target instanceof HTMLElement) {
            const token = target.closest(SELECTOR_TOKEN);
            if (token instanceof HTMLElement) {
                const sid = token.dataset.sid;
                if (sid) {
                    toggleSentenceClass(sid, CLASS_HOVER, false);
                }
            }
        }
    });
}

/**
 * Removes the active class from ALL elements in the DOM.
 */
function clearAllActive(className: string) {
    const activeElements = document.querySelectorAll(`.${className}`);
    if (activeElements.length > 0) {
        activeElements.forEach(el => el.classList.remove(className));
        // console.debug('[Structure] Cleared Focus');
    }
}

/**
 * Adds the active class to all tokens belonging to a specific Sentence ID (sid).
 */
function activateSentence(sid: string, className: string) {
    const tokens = document.querySelectorAll(`.s-token[data-sid="${sid}"]`);
    if (tokens.length > 0) {
        tokens.forEach(el => el.classList.add(className));
        // console.debug(`[Structure] Activated SID: ${sid}`);
    }
}

/**
 * Helper to add/remove class for a whole sentence.
 * Optimized for hover performance (avoids repetitive querySelectorAll if possible? 
 * Actually querySelectorAll by attribute is fast enough for hover).
 */
function toggleSentenceClass(sid: string, className: string, add: boolean) {
    const tokens = document.querySelectorAll(`.s-token[data-sid="${sid}"]`);
    tokens.forEach(el => {
        if (add) el.classList.add(className);
        else el.classList.remove(className);
    });
}
