/**
 * Structure Label Positioner
 * 
 * Design: Labels appear directly above their target words and scroll with content.
 * Uses position: absolute relative to article container so labels move with page scroll.
 * 
 * REFACTORED: Uses centralized GRAMMAR_ROLES definition.
 */

import { type StructureRole, GRAMMAR_ROLES } from '../../structure/definitions';

// Constants
const LABEL_OFFSET = 18; // px above text
const MIN_LABEL_GAP = 2; // px horizontal buffer
const NUDGE_HEIGHT = 16; // px to lift when overlapping

/**
 * Clear all dynamically created labels and connectors
 */
export function clearLabels(): void {
    document.querySelectorAll('.structure-label, .structure-connector').forEach(el => el.remove());
}

// Helper to detect if element A contains element B
// function contains(parent: Element, child: Element): boolean {
//    return parent !== child && parent.contains(child);
// }

// Type for internal calculation
interface LabelInfo {
    element: HTMLElement;
    rect: DOMRect;
    depth: number;
    parent: HTMLElement | null;
    id: string; // Unique ID for finding this specific label later
    text: string;
    color: string;
    baseTop: number;
    finalTop: number;
    labelRect: DOMRect;
    left: number;
    nudged?: boolean;
    label: HTMLElement; // The rendered label element
}

interface CollisionItem {
    element: HTMLElement;
    labelRect: DOMRect;
    left: number;
    finalTop: number;
    depth: number;
    nudged?: boolean;
    baseTop: number;
    connector?: HTMLElement | null;
}

export function positionStructureLabels(container: HTMLElement): void {
    const structureSpans = Array.from(container.querySelectorAll('[data-structure]:has(.structure-active)'));
    if (structureSpans.length === 0) return;

    clearLabels();

    const containerRect = container.getBoundingClientRect();
    const spanMap = new Map<HTMLElement, LabelInfo>();
    const labels: CollisionItem[] = [];

    // 1. Analyze Hierarchy (Depth & Nearest Parent)
    structureSpans.forEach((span, index) => {
        const structureSpan = span as HTMLElement;
        const role = structureSpan.dataset.structure;
        if (!role) return;

        const id = `st-${index}`;
        structureSpan.setAttribute('data-st-id', id);

        // Find nearest parent
        let parentSpan: HTMLElement | null = null;
        let minParentLen = Infinity;

        for (const other of structureSpans) {
            if (other === span) continue;
            if (other.contains(span)) {
                // Cast to HTMLElement to read innerText
                const len = (other as HTMLElement).innerText.length;
                if (len < minParentLen) {
                    minParentLen = len;
                    parentSpan = other as HTMLElement;
                }
            }
        }

        const rect = span.getBoundingClientRect();
        const def = GRAMMAR_ROLES[role as StructureRole];

        // Skip hidden labels (e.g. Connectives)
        if (def && def.noLabel) return;

        const text = def ? def.label : role.toUpperCase();
        const color = def ? def.color : '#1e293b';

        // Adjust standard top
        const baseTop = rect.top - containerRect.top - LABEL_OFFSET;

        // Depth Logic: Nested = Depth 1
        const depth = parentSpan ? 1 : 0;

        const info: LabelInfo = {
            element: structureSpan,
            rect,
            depth,
            parent: parentSpan,
            id,
            text,
            color,
            baseTop,
            finalTop: baseTop,
            labelRect: { width: 0, height: 0 } as DOMRect, // Placeholder
            left: 0,
            label: null as any
        };

        spanMap.set(structureSpan, info);
    });

    // 2. Render Labels & Bind Events
    spanMap.forEach((info) => {
        const label = document.createElement('div');
        info.label = label;
        label.className = `structure-label st-depth-${info.depth}`;
        label.innerText = info.text;

        // CSS Variable for color
        label.style.setProperty('--label-color', info.color);
        label.dataset.forId = info.id; // Link back to span ID

        container.appendChild(label);

        // Position calculation
        const labelRect = label.getBoundingClientRect();
        info.labelRect = labelRect;

        // Center label relative to span
        const relativeLeft = info.rect.left - containerRect.left;
        info.left = relativeLeft + (info.rect.width - labelRect.width) / 2;

        label.style.left = `${Math.max(0, info.left)}px`;
        label.style.top = `${info.finalTop}px`;

        // Add to collision list
        labels.push({
            element: label,
            labelRect,
            left: info.left,
            finalTop: info.finalTop,
            depth: info.depth,
            baseTop: info.baseTop,
            connector: null
        });

        // --- Interaction Binding ---
        // Logic: Hover Parent -> Fade Parent, Show Children
        // Logic: Hover Child (Dot) -> Fade Parent, Show Children (Self + Siblings)

        const myChildren = Array.from(spanMap.values()).filter(i => i.parent === info.element);
        const hasChildren = myChildren.length > 0;

        // Cursor Hint
        if (info.depth === 0 && hasChildren) {
            info.element.style.cursor = 'pointer';
        }

        const handleEnter = () => {
            if (info.depth === 0 && hasChildren) {
                // Parent Hover
                label.classList.add('st-fade-out');
                myChildren.forEach(c => c.label.classList.add('st-fade-in'));
            } else if (info.depth === 1 && info.parent) {
                // Child/Dot Hover
                const pInfo = spanMap.get(info.parent);
                if (pInfo) {
                    pInfo.label.classList.add('st-fade-out');
                    const siblings = Array.from(spanMap.values()).filter(i => i.parent === info.parent);
                    siblings.forEach(s => s.label.classList.add('st-fade-in'));
                }
            }
        };

        const handleLeave = () => {
            if (info.depth === 0 && hasChildren) {
                label.classList.remove('st-fade-out');
                myChildren.forEach(c => c.label.classList.remove('st-fade-in'));
            } else if (info.depth === 1 && info.parent) {
                const pInfo = spanMap.get(info.parent);
                if (pInfo) {
                    pInfo.label.classList.remove('st-fade-out');
                    const siblings = Array.from(spanMap.values()).filter(i => i.parent === info.parent);
                    siblings.forEach(s => s.label.classList.remove('st-fade-in'));
                }
            }
        };

        info.element.addEventListener('mouseenter', handleEnter);
        info.element.addEventListener('mouseleave', handleLeave);
        label.addEventListener('mouseenter', handleEnter);
        label.addEventListener('mouseleave', handleLeave);
    });

    // 3. Collision Detection (Simple One-Pass Nudge)
    // Only nudge items at the same depth to avoid layer jumping
    labels.sort((a, b) => a.left - b.left);
    for (let i = 1; i < labels.length; i++) {
        const current = labels[i];
        for (let j = i - 1; j >= 0; j--) {
            const prev = labels[j];
            if (current.depth !== prev.depth) continue; // Skip different depths

            const currentRight = current.left + current.labelRect.width;
            const prevRight = prev.left + prev.labelRect.width;

            const hOverlap = !(currentRight + MIN_LABEL_GAP <= prev.left || current.left >= prevRight + MIN_LABEL_GAP);
            const sameLevel = Math.abs(current.finalTop - prev.finalTop) < NUDGE_HEIGHT;

            if (hOverlap && sameLevel) {
                current.finalTop = prev.finalTop - NUDGE_HEIGHT;
                current.nudged = true;
                current.element.style.top = `${current.finalTop}px`;
            }
        }
    }

    // 4. Connectors (Lines)
    labels.forEach((item) => {
        if (item.nudged) {
            const connector = document.createElement('div');
            // Add depth class to connector so it hides in Dot Mode
            connector.className = `structure-connector st-depth-${item.depth}`;

            const labelCenterX = item.left + item.labelRect.width / 2;
            const connectorTop = item.finalTop + item.labelRect.height;
            const connectorHeight = item.baseTop - item.finalTop - 2;

            connector.style.cssText = `
                position: absolute;
                left: ${labelCenterX}px;
                top: ${connectorTop}px;
                width: 1px;
                height: ${Math.max(0, connectorHeight)}px;
                background: var(--label-color, #64748b);
                opacity: 0.4;
            `;
            // Copy var from label
            const color = item.element.style.getPropertyValue('--label-color');
            connector.style.setProperty('--label-color', color);

            container.appendChild(connector);
            item.connector = connector;
        }
    });
}
