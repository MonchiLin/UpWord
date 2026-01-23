import { TaskQueue } from '../src/services/tasks/queue';

const WORKER_INTERVAL_MS = 10000; // Check every 10 seconds
let isWorking = false;

/**
 * [后台任务消费者进程 (taskWorker.ts)]
 * ------------------------------------------------------------------
 * 功能：独立于 HTTP 请求周期的无限循环进程，负责消费任务队列。
 *
 * 核心机制: **Recursive Polling (递归轮询)**
 * - 为什么不用 `setInterval`? 
 *   为了防止任务堆积 (Drift)。若任务耗时 > Interval，`setInterval` 会导致并发爆炸。
 *   递归 `setTimeout` 确保上一个任务彻底完成后，才开始下一次倒计时。
 * - 进程隔离：在 Node.js 单线程模型下，通过 Event Loop 让出 CPU 时间片，防止阻塞 HTTP 响应。
 *
 * 技术背景：
 * - 基础设施零依赖 (Zero-Infra): 基于 DB 轮询，无需引入 Redis/RabbitMQ。
 */
async function runWorker(queue: TaskQueue) {
    if (isWorking) return;
    isWorking = true;
    try {
        await queue.processQueue();
    } catch (e) {
        console.error("Worker error:", e);
    } finally {
        isWorking = false;
        setTimeout(() => runWorker(queue), WORKER_INTERVAL_MS);
    }
}

export function startTaskWorker(queue: TaskQueue) {
    setTimeout(() => runWorker(queue), 1000); // Start after 1s delay
    console.log('[Task Worker] Started with 10s interval');
}
