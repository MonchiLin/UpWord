import type { Article } from './types';

// Grid Constants
// Vertical Resolution: 24 rows (High Res)
const ROWS = 24;

interface GridItem {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number; // Grid units
    article?: Article;
    variant?: CardShape['variant'];
    stylePreset?: 'default' | 'inverted' | 'accent' | 'serif' | 'minimal' | 'bordered';
    colMod?: boolean;
}

/**
 * DETERMINISTIC RANDOM HELPER
 * Returns a float between 0 and 1 based on an ID and a salt.
 */
function pseudoRandom(id: string, salt: number = 0): number {
    let hash = 0;
    const str = id + salt.toString();
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
}

import { getRandomShape, type CardShape } from './CardRegistry';

/**
 * GET PREFERRED DIMENSIONS
 * Ask the article what it *wants* to be, ideally.
 * Returns Defined Shapes from Catalogue.
 */
function getPreferredDimensions(article: Article, rand: (min: number, max: number) => number) {
    const { size } = article;

    // Use the curated catalogue
    // We pass the size to filter appropriate shapes
    const shape = getRandomShape(size);

    // Add small random noise?
    // User wants "Defined Shapes", so NO noise. Keep it strict.

    return { w: shape.w, h: shape.h, variant: shape.variant, stylePreset: shape.stylePreset };
}


/**
 * The True Chaos Engine (Gapless)
 */
export function computeSmartLayout(articles: Article[]): GridItem[] {
    // Grid State
    // We only track occupied cells. Infinite width initially.
    // grid[x][y]
    const grid: boolean[][] = [];
    const placedItems: GridItem[] = [];

    // --- HELPERS ---

    const checkOccupied = (x: number, y: number) => {
        if (!grid[x]) return false;
        return !!grid[x][y];
    };

    const markOccupied = (x: number, y: number, w: number, h: number) => {
        for (let ix = x; ix < x + w; ix++) {
            if (!grid[ix]) grid[ix] = new Array(ROWS).fill(false);
            for (let iy = y; iy < y + h; iy++) {
                grid[ix][iy] = true;
            }
        }
    };

    /**
     * MEASURE FREE SPACE
     * Starting at (x,y), how big of a rectangle can we fit?
     */
    const getAvailableSpace = (startX: number, startY: number) => {
        // Max Width (Scan until blocked or reasonable limit)
        let maxW = 0;
        const LIMIT_SCAN_W = 40; // Don't look too far

        for (let w = 1; w <= LIMIT_SCAN_W; w++) {
            // Check if this *vertical column strip* at startX+w-1 is free from startY downwards
            // But Wait, "Maximal Rectangle" is complex. 
            // Simplified: Check simply how wide we can go at the TOP line (startY).
            if (checkOccupied(startX + w - 1, startY)) break;
            maxW = w;
        }

        // Now, for that MaxW, what is the *common* max height?
        // Actually, usually we pick a Width first, then check Height.
        // Chaos mode: Let's assume infinite height is NOT guaranteed because of "overhangs".
        // We need to check the rect area.

        return { maxW };
    };

    const verifyRectFree = (x: number, y: number, w: number, h: number) => {
        if (y + h > ROWS) return false;
        for (let ix = x; ix < x + w; ix++) {
            for (let iy = y; iy < y + h; iy++) {
                if (checkOccupied(ix, iy)) return false;
            }
        }
        return true;
    };

    // --- MAIN LOOP ---

    const queue = [...articles];
    let searchX = 0;

    // Safety
    let iterations = 0;

    while (queue.length > 0 && iterations < 5000) {
        iterations++;

        // 1. Find the first empty pixel (Gap Hunting)
        let gapX = -1;
        let gapY = -1;

        // Scan logic: Scan vertical columns. Iterate X.
        outerScan:
        for (let x = searchX; x < searchX + 50; x++) {
            if (!grid[x]) grid[x] = new Array(ROWS).fill(false);
            for (let y = 0; y < ROWS; y++) {
                if (!grid[x][y]) {
                    gapX = x;
                    gapY = y;
                    break outerScan;
                }
            }
        }

        if (gapX === -1) {
            searchX += 10; // Jump ahead if mostly full
            continue;
        }

        // 2. RETROACTIVE ELASTICITY
        // Before we place a new item, check valid available width.
        const { maxW } = getAvailableSpace(gapX, gapY);

        // If the gap is tiny (e.g. < 4 units wide), it's "Unusable" for a new article.
        // We must stretch the LEFT neighbor to cover it.
        if (maxW < 4) {
            // Find neighbor to the left at this Y
            const leftX = gapX - 1;
            if (leftX >= 0) {
                // Determine which item is occupying (leftX, gapY)
                // This requires linear search of placedItems (slow but fine for N=50)
                const neighbor = placedItems.find(p =>
                    p.x <= leftX &&
                    (p.x + p.w) > leftX &&
                    p.y <= gapY &&
                    (p.y + p.h) > gapY
                );

                if (neighbor) {
                    // Check if neighbor aligns vertically (Top edge matches)
                    // Simplified safe stretch: Only stretch if Y matches exactly or occupies fully.
                    // Actually, we just need to confirm we can extend W at that specific Y range.
                    // But `neighbor` has a specific `h`. 
                    // We only stretch if gapY aligns with neighbor.y AND neighbor covers gapY+neighbor.h?
                    // NO, gapY is just the top of the hole. 

                    // Gap Logic: The hole starts at gapY.
                    // We need to stretch neighbor to fill (gapX, gapY) to (gapX + maxW, gapY + ?)

                    // Simple Strategy: Only stretch if neighbor includes gapY and neighbor.h fits available space?
                    // Let's just blindly stretch the neighbor's width, 
                    // BUT we must re-verify that the *extension* doesn't hit *other* things below gapY.

                    // Check if neighbor extension collision free
                    const extensionW = maxW;
                    // We want to extend neighbor by `extensionW`.
                    // The area to check is (neighbor.x + neighbor.w, neighbor.y) with w=extensionW, h=neighbor.h
                    // effectively strictly starting at gapX? 
                    // gapX IS neighbor.x + neighbor.w (roughly).

                    // Precise check:
                    if (neighbor.y <= gapY && (neighbor.y + neighbor.h) > gapY) {
                        // Neighbor covers this Y band.
                        if (verifyRectFree(gapX, neighbor.y, extensionW, neighbor.h)) {
                            markOccupied(gapX, neighbor.y, extensionW, neighbor.h);
                            neighbor.w += extensionW;
                            neighbor.colMod = true; // Mark as modified/wide
                        } else {
                            // Can't stretch full height. Mark dead.
                            markOccupied(gapX, gapY, 1, 1);
                        }
                    } else {
                        markOccupied(gapX, gapY, 1, 1);
                    }
                } else {
                    markOccupied(gapX, gapY, 1, 1);
                }
            } else {
                markOccupied(gapX, gapY, 1, 1); // Edge case 0
            }
            continue; // Restart loop to find next gap
        }

        // 3. Select Article
        // We have a usable gap of width `maxW`.
        // Pick an article that fits best, or just the next one.
        // Chaos: Just take the next one and mold it.
        const article = queue.shift();
        if (!article) break;

        // 4. Determine Shape
        // Random Seed
        const rand = (min: number, max: number) => {
            const r = pseudoRandom(article.id, iterations); // Salt with iterations to avoid stuck state
            return Math.floor(r * (max - min + 1)) + min;
        };

        let { w, h, variant } = getPreferredDimensions(article, rand);

        // 5. Constrain Width
        // Clamp to available space
        if (w > maxW) w = maxW;

        // 6. Constrain Height (Gravity & Overhangs)
        // Check if this WxH rect actually fits (is the ground flat?)
        // If not, shrink H or W. 
        // Strategy: Verify Rect. If collision, shrink H until fits.
        while (h > 0 && !verifyRectFree(gapX, gapY, w, h)) {
            h--;
        }

        // 7. SNAP TO FLOOR (Vertical Elasticity)
        const spaceBelow = ROWS - (gapY + h);
        if (spaceBelow < 4 && spaceBelow >= 0) {
            // If gap below is tiny (<4), SNAP TO BOTTOM.
            // But check if that space is actually free!
            if (verifyRectFree(gapX, gapY, w, ROWS - gapY)) {
                h = ROWS - gapY;
            }
        }

        // 8. Place it (if valid)
        if (h >= 4 && w >= 4) {
            markOccupied(gapX, gapY, w, h);
            placedItems.push({
                id: article.id,
                article,
                x: gapX,
                y: gapY,
                w, h, variant
            });
        } else {
            // Failed to fit even after shrinking.
            // This usually happens when we run out of vertical space (e.g., only 2 rows left at bottom).
            // INSTEAD OF BURNING (Creating holes), we should STRETCH THE ITEM ABOVE.

            if (gapY > 0) {
                // Try to find the item occupying (gapX, gapY - 1)
                const topNeighbor = placedItems.find(p =>
                    p.x <= gapX && (p.x + p.w) > gapX &&
                    (p.y + p.h) === gapY
                );

                if (topNeighbor) {
                    // CAUTION: T-SHAPE COLLISION CHECK
                    // We can only stretch the neighbor if the *entire width* of the neighbor
                    // is free downwards.
                    // The scan only told us that `gapX` (one column) is free for `freeH`.
                    // We must verify `topNeighbor.w`.

                    let canStretch = true;
                    const proposedExtensionH = ROWS - gapY; // Try to snap to bottom?
                    // Or just fill finding the min free height across width?

                    // Let's safe-check: Can we extend by 1 row across full width?
                    // If yes, extend by 1. Keep it simple. Loop will handle subsequent rows.
                    // Better: check max possible extension.

                    let allowedH = 0;
                    // Check if valid for rows gapY...ROWS
                    for (let hTest = 1; hTest <= (ROWS - gapY); hTest++) {
                        let rowClean = true;
                        // Check the full width of the neighbor at this Y
                        for (let ix = topNeighbor.x; ix < topNeighbor.x + topNeighbor.w; ix++) {
                            if (checkOccupied(ix, gapY + hTest - 1)) {
                                rowClean = false;
                                break;
                            }
                        }
                        if (rowClean) allowedH = hTest;
                        else break;
                    }

                    if (allowedH > 0) {
                        // Safe to stretch
                        topNeighbor.h += allowedH;
                        markOccupied(topNeighbor.x, gapY, topNeighbor.w, allowedH);
                        // We burned the whole rect, so searchX will advance past this neighbor's column eventually,
                        // but for the current loop, `searchX` is still behind.
                        // But since we marked the grid, the outer scan will skip these now-occupied cells.
                    } else {
                        // Neighbor is blocked in other columns. Can't stretch.
                        markOccupied(gapX, gapY, 1, 1);
                    }
                } else {
                    markOccupied(gapX, gapY, 1, 1);
                }
            } else {
                markOccupied(gapX, gapY, 1, 1); // Edge case: Top row fail
            }

            // Put it back
            queue.unshift(article);
        }
    }

    return placedItems;
}

