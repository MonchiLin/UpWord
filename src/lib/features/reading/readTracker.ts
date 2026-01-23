/**
 * Read Tracker - 阅读追踪器
 * 
 * 追踪用户阅读进度并标记为已读
 */
import { apiFetch } from '../../api';

let readTimer: number | undefined;

/**
 * 追踪阅读进度
 */
export function trackReading() {
    if (readTimer) clearTimeout(readTimer);

    const main = document.querySelector('main[data-article-id]');
    const isAdmin = main?.getAttribute('data-is-admin') === 'true';
    if (!isAdmin) return;

    const articleId = main?.getAttribute('data-article-id');
    const currentMask = parseInt(main?.getAttribute('data-read-levels') || '0');

    const activeLevel = document.querySelector('.article-level[data-active]');
    if (!activeLevel || !articleId) return;

    const level = parseInt(activeLevel.getAttribute('data-level') || '1');
    const minutes = parseInt(activeLevel.getAttribute('data-minutes') || '1');

    // [Downward Inclusion Strategy]
    // 假设：用户能阅读 L3，必然也能阅读 L1/L2。
    // 意图：减少用户操作负担，一次提交自动点亮所有低维度的 "Read" 状态。
    // 实现：Target Mask 是包含所有低位的二进制全1序列 (e.g. L3=111)。
    // 优化：利用位运算 `(current & target) === target` 快速幂等检查 (Idempotency Check)。
    const targetMask = (1 << level) - 1;

    // 位运算检查：(Current & Target) === Target
    // 意味着 Target 的所有位都已经在 Current 中置 1 了，无需重复提交。
    if ((currentMask & targetMask) === targetMask) return;

    // [Smart Thresholding Heuristic]
    // 意图：区分 "Scanning" (扫视) 和 "Reading" (深度阅读)。
    // 规则：
    // 1. 动态阈值：基于文章长度估算 (WordCount -> Estimated Minutes -> 50% Threshold)。
    // 2. 最小低保：至少停留 10s，防止误触。
    // 3. 视觉锚点：必须进入 `visibility` 状态且滚动到该区域 (Implied by current logic usually, simplified here).
    const threshold = Math.max(10000, minutes * 30 * 1000);

    readTimer = window.setTimeout(async () => {
        try {
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
