/**
 * Feature: Structure Reveal Interaction
 * 
 * Manages user interactions for the "Structure" feature.
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
 * 4. **Smart Copy** (optional):
 *    - If enabled in settings, auto-copies sentence text to clipboard on activation.
 * 
 * **Architecture**:
 * - Uses **Event Delegation** on `document` to avoid attaching thousands of listeners to individual tokens.
 * - Scoped to `.article-level` container to prevent cross-level SID collisions.
 * - Initialization is idempotent via `data-structure-init` attribute on body.
 */

import { positionStructureLabels, clearLabels } from './labelPositioner';
import { settingsStore } from '../../store/settingsStore';
import { audioState } from '../../store/audioStore';
import { interactionStore } from '../../store/interactionStore';

export function initStructureInteraction() {
    if (typeof document === 'undefined') return;

    const ATTR_INIT = 'data-structure-init';
    // 结构激活状态 (Structure Active State): 点击句子触发，显示 S/V/O 标签并高亮成分
    const CLASS_ACTIVE = 'structure-active';
    const CLASS_HOVER = 'sentence-hover';
    const SELECTOR_TOKEN = '.s-token';
    const SELECTOR_CONTAINER = '#article-content';
    const SELECTOR_LEVEL = '.article-level';

    // Idempotency Check: Prevent duplicate initialization
    if (document.body.hasAttribute(ATTR_INIT)) return;
    document.body.setAttribute(ATTR_INIT, 'true');

    console.log('[Structure] Initializing Interaction Protocol (Scoped)...');

    // --- Click Delegation ---
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;

        // 1. Context Check: Inside Article?
        const articleContent = target.closest(SELECTOR_CONTAINER);

        // Case A: Click OUTSIDE (Dismiss)
        if (!articleContent) {
            clearAllActive(CLASS_ACTIVE);
            clearLabels();
            return;
        }

        // Case B: Click INSIDE
        const token = target.closest(SELECTOR_TOKEN);
        if (token instanceof HTMLElement) {
            const sid = token.dataset.sid;
            // [Fix] Scope to the active level container to prevent cross-level collision
            const levelContainer = token.closest(SELECTOR_LEVEL);

            if (sid && levelContainer instanceof HTMLElement) {
                // Strategy: Clear Everything -> Activate Target (Scoped)
                clearAllActive(CLASS_ACTIVE);
                clearLabels();

                activateSentence(levelContainer, sid, CLASS_ACTIVE);

                // Position labels relative to the article content container
                requestAnimationFrame(() => {
                    if (articleContent instanceof HTMLElement) {
                        positionStructureLabels(articleContent);
                    }
                });
                return;
            }
        }

        // Case C: Clicked whitespace or non-token inside article (Dismiss)
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
    document.addEventListener('mouseover', (e) => {
        const target = e.target;
        if (target instanceof HTMLElement) {
            const token = target.closest(SELECTOR_TOKEN);
            if (token instanceof HTMLElement) {
                const sid = token.dataset.sid;
                const levelContainer = token.closest(SELECTOR_LEVEL);

                if (sid && levelContainer instanceof HTMLElement) {
                    toggleSentenceClass(levelContainer, sid, CLASS_HOVER, true);
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
                const levelContainer = token.closest(SELECTOR_LEVEL);

                if (sid && levelContainer instanceof HTMLElement) {
                    toggleSentenceClass(levelContainer, sid, CLASS_HOVER, false);
                }
            }
        }
    });

    // --- Resize Handling (Robustness) ---
    let resizeTimer: number;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            // Re-calculate positions if there are active structure elements
            const activeElements = document.querySelectorAll(`.${CLASS_ACTIVE}`);
            if (activeElements.length > 0) {
                const articleContent = document.querySelector(SELECTOR_CONTAINER) as HTMLElement;
                if (articleContent) {
                    positionStructureLabels(articleContent);
                }
            }
        }, 100); // Debounce 100ms
    });

    // --- Sync Hover from Interaction Store ---
    // Replaces 'sync-sentence-hover' event listener
    interactionStore.subscribe((state) => {
        const sid = state.hoveredSentenceIndex;
        const level = document.querySelector(SELECTOR_LEVEL + '[data-active]'); // Only apply to active level

        // Remove existing hover highlights from this level first (optional but safer)
        if (level instanceof HTMLElement) {
            const existing = level.querySelectorAll(`.${CLASS_HOVER}`);
            existing.forEach(el => el.classList.remove(CLASS_HOVER));

            if (typeof sid === 'number' && sid >= 0) {
                toggleSentenceClass(level, sid.toString(), CLASS_HOVER, true);
            }
        }
    });

    // --- Sync Audio Playback Highlight from Audio Store ---
    // Replaces 'audio-sentence-change' event listener
    let lastPlayingSid: number = -1;
    const HIGHLIGHT_CLASSES = 'bg-purple-100 text-purple-900 shadow-sm ring-1 ring-purple-200 rounded transition-colors duration-200';

    audioState.subscribe((state) => {
        const { currentIndex, isPlaying } = state;
        const level = document.querySelector(SELECTOR_LEVEL + '[data-active]');

        if (!(level instanceof HTMLElement)) return;

        // Clear previous highlight if index changed
        if (lastPlayingSid !== -1 && lastPlayingSid !== currentIndex) {
            toggleSentenceClass(level, lastPlayingSid.toString(), HIGHLIGHT_CLASSES, false);
        }

        // Also clear if paused? No, usually we keep highlight when paused for reference.
        // But if we stopped (currentIndex 0, !isPlaying), maybe we should clear if it was reset?
        // Actually, let's strictly follow isPlaying for "Active" look, or just position.
        // The original logic cleared highlight if !isPlaying.

        if (!isPlaying) {
            if (lastPlayingSid !== -1) {
                toggleSentenceClass(level, lastPlayingSid.toString(), HIGHLIGHT_CLASSES, false);
                lastPlayingSid = -1;
            }
            return;
        }

        // Apply new highlight
        if (isPlaying && currentIndex >= 0) {
            // Ensure previous is cleared (double check)
            if (lastPlayingSid !== -1 && lastPlayingSid !== currentIndex) {
                toggleSentenceClass(level, lastPlayingSid.toString(), HIGHLIGHT_CLASSES, false);
            }

            toggleSentenceClass(level, currentIndex.toString(), HIGHLIGHT_CLASSES, true);
            lastPlayingSid = currentIndex;

            // Auto-scroll to keep playing sentence in view
            const firstToken = level.querySelector(`.s-token[data-sid="${currentIndex}"]`);
            if (firstToken) {
                firstToken.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
}

/**
 * Removes the active class from ALL elements in the DOM.
 * We clear globally to be safe (ensure no stuck states in hidden levels).
 */
function clearAllActive(className: string) {
    const activeElements = document.querySelectorAll(`.${className}`);
    if (activeElements.length > 0) {
        activeElements.forEach(el => el.classList.remove(className));
    }
}

/**
 * Adds the active class to tokens belonging to a specific Sentence ID (sid),
 * BUT ONLY within the specified level container.
 */
function activateSentence(container: HTMLElement, sid: string, className: string) {
    const tokens = container.querySelectorAll(`.s-token[data-sid="${sid}"]`);
    if (tokens.length > 0) {
        tokens.forEach(el => el.classList.add(className));

        // [Feature] Smart Copy - Auto copy sentence text to clipboard
        const { autoCopy } = settingsStore.get();
        if (autoCopy) {
            try {
                // Construct text from token content (preserves spaces)
                const text = Array.from(tokens).map(t => t.textContent).join('');
                if (text) {
                    navigator.clipboard.writeText(text).then(() => {
                        console.log('[Structure] Auto-copied:', text.substring(0, 30) + '...');
                    }).catch(err => {
                        console.warn('[Structure] Copy failed:', err);
                    });
                }
            } catch (e) {
                console.warn('[Structure] Auto-copy logic error:', e);
            }
        }
    }
}

/**
 * Helper to add/remove class for a whole sentence (Scoped).
 */
function toggleSentenceClass(container: HTMLElement, sid: string, className: string, add: boolean) {
    const tokens = container.querySelectorAll(`.s-token[data-sid="${sid}"]`);
    const classes = className.split(' ').filter(Boolean);
    tokens.forEach(el => {
        if (add) el.classList.add(...classes);
        else el.classList.remove(...classes);
    });
}
