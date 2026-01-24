/**
 * Read Tracker - 阅读追踪器
 * 
 * 追踪用户阅读进度并标记为已读
 */
import { apiFetch } from '../../api';

let readTimer: number | undefined;
let isAdminMode = false; // Local state, updated by event

/**
 * 追踪阅读进度
 */
export function trackReading() {
    if (readTimer) clearTimeout(readTimer);

    // Dynamic Admin Check (Event Driven or Attribute Check)
    const main = document.querySelector('main[data-article-id]');
    // Double check attribute just in case island loaded before script execution (race condition in favor)
    if (!isAdminMode && main?.getAttribute('data-is-admin') !== 'true') return;

    // ... logic continues ...
    const articleId = main?.getAttribute('data-article-id');
    const currentMask = parseInt(main?.getAttribute('data-read-levels') || '0');

    const activeLevel = document.querySelector('.article-level[data-active]');
    if (!activeLevel || !articleId) return;

    const level = parseInt(activeLevel.getAttribute('data-level') || '1');
    const minutes = parseInt(activeLevel.getAttribute('data-minutes') || '1');
    const targetMask = (1 << level) - 1;

    if ((currentMask & targetMask) === targetMask) return;

    const threshold = Math.max(10000, minutes * 30 * 1000);

    readTimer = window.setTimeout(async () => {
        try {
            // [Refactor] Reverted to apiFetch (KISS)
            await apiFetch(`/api/articles/${articleId}/read`, {
                method: 'PATCH',
                body: JSON.stringify({ level })
            });

            // Update DOM state optimistically
            main?.setAttribute('data-read-levels', String(currentMask | targetMask));
            console.log('[ReadTracker] Marked as read:', level);
        } catch (e) {
            console.error('[ReadTracker] Failed:', e);
        }
    }, threshold);
}

// Listen for Server Island Event
document.addEventListener('admin-mode-active', () => {
    console.log("[ReadTracker] Admin Mode Activated by Server Island");
    isAdminMode = true;
    trackReading(); // Re-trigger check
});

/**
 * 清除阅读追踪计时器
 */
export function clearReadTimer() {
    if (readTimer) {
        clearTimeout(readTimer);
        readTimer = undefined;
    }
}

/**
 * 初始化阅读追踪 (绑定事件)
 */
export function initReadTracker() {
    // 绑定 Visibility Change 以暂停/清除计时
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearReadTimer();
        } else {
            trackReading();
        }
    });

    // 初始化追踪
    trackReading();
}
