
/**
 * Assigns a deterministic color from a palette based on a string input.
 * Used for consistent topic coloring.
 */
export function getStringColor(str: string): 'stone' | 'blue' | 'green' | 'red' | 'amber' {
    if (!str) return 'stone';

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors: ('stone' | 'blue' | 'green' | 'red' | 'amber')[] = [
        'blue',
        'green',
        'amber',
        'red',
        // 'stone' (Excluded from rotation to keep it special/default if needed, or include it)
    ];

    // Use positive remainder
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}
