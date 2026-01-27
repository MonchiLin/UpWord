import type { AppKysely } from '../../db/factory';
import type { TaskRow } from '../../types/models';
import { TaskExecutor } from './executor';

/**
 * [分布式任务队列 (queue.ts)]
 * ------------------------------------------------------------------
 * 功能：基于数据库 (Kysely) 的持久化任务调度简单实现。
 *
 * 核心机制：
 * - 乐观锁分配 (Optimistic Locking): 使用 CAS (Compare-And-Swap) `version` 字段防止多 Worker 同时抢占任务。
 * - 僵尸检测 (Zombie Detection): 配合 `locked_until` 字段，自动识别并重置超时未续租的 Running 任务。
 * - 串行卫士: 代码层面强制同一时刻仅允许一个 Active Task (Global Singleton Lock)，以规避 LLM Rate Limit。
 *
 * 维护清单：
 * - TODO(Performance): 当前轮询 (Polling) 机制在空闲时有 DB 读压力，未来可考虑改为 Redis Pub/Sub 通知。
 */
export class TaskQueue {
    private executor: TaskExecutor;

    constructor(private db: AppKysely) {
        this.executor = new TaskExecutor(db);
    }

    /**
     * Enqueue Standard Task
     * Create generation tasks for a specific date across all active profiles.
     * Auto-creates a default profile if none exist.
     */
    async enqueue(taskDate: string, triggerSource: 'manual' | 'cron' = 'manual', llm?: string, mode: 'rss' | 'impression' = 'rss') {
        const profiles = await this.db.selectFrom('generation_profiles').selectAll().execute();

        // 首次使用时自动创建默认 Profile，降低上手门槛
        if (profiles.length === 0) {
            const defId = crypto.randomUUID();
            await this.db.insertInto('generation_profiles')
                .values({
                    id: defId,
                    name: 'Default',
                })
                .onConflict((oc) => oc.doNothing())
                .execute();
        }

        const activeProfiles = await this.db.selectFrom('generation_profiles').selectAll().execute();

        // Pre-flight Check: Daily words must exist before content generation
        const dailyRow = await this.db.selectFrom('daily_word_references')
            .selectAll()
            .where('date', '=', taskDate)
            .limit(1)
            .execute();

        if (dailyRow.length === 0) {
            throw new Error(`No daily words found for ${taskDate}. Please fetch words first.`);
        }

        const newTasks: Array<{ id: string; profileId: string; profileName: string }> = [];

        for (const profile of activeProfiles) {
            const taskId = crypto.randomUUID();

            await this.db.insertInto('tasks')
                .values({
                    id: taskId,
                    task_date: taskDate,
                    type: 'article_generation',
                    trigger_source: triggerSource,
                    status: 'queued',
                    profile_id: profile.id,
                    version: 0,  // Optimistic Lock Initial Version
                    llm: (llm as any) || null,
                    mode,
                    // result_json: removed
                })
                .execute();

            newTasks.push({ id: taskId, profileId: profile.id, profileName: profile.name });
        }

        return newTasks;
    }

    /**
     * Enqueue Impression Task
     * Generates an "Impression" article using randomly selected words from the dictionary.
     * - Does NOT enforce daily word validaton.
     * - Generates candidate words at runtime (stored in memory, not DB).
     */
    async enqueueImpression(taskDate: string, wordCount: number = 1024, llm?: string) {
        // 从 words 表随机选取词汇
        const randomWords = await this.db
            .selectFrom('words')
            .select('word')
            .orderBy(({ fn }) => fn('random', []))
            .limit(wordCount)
            .execute();

        if (randomWords.length === 0) {
            throw new Error('No words in database. Please add words first.');
        }

        // [Updated] Impression 模式不再关联 Profile
        // 用户反馈：IMPRESSION 应该是完全独立的，不依赖 Profile 系统。
        // See Step 1975 logic.

        const taskId = crypto.randomUUID();
        const candidateWords = randomWords.map(w => w.word);

        await this.db.insertInto('tasks')
            .values({
                id: taskId,
                task_date: taskDate,
                type: 'article_generation',
                trigger_source: 'manual',
                status: 'queued',
                profile_id: null, // <--- Decoupled
                version: 0,
                llm: (llm as any) || null,
                mode: 'impression',
                context_json: JSON.stringify({
                    impressionTargetLength: wordCount // Store constraint for executor
                })
            })
            .execute();

        console.log(`[TaskQueue] Created IMPRESSION task ${taskId} with ${candidateWords.length} words`);

        return [{ id: taskId, profileId: 'IMPRESSION', wordCount: candidateWords.length }];
    }

    /**
     * 认领任务 (Atomic Claim)
     * 使用乐观锁机制从队列中获取下一个可执行任务。
     *
     * 并发策略:
     * 1. 全局并发卫士: 暂时强制每个 Worker Pool 串行执行，若有正在运行且未过期的任务，则跳过。
     * 2. 候选者筛选: 优先选择 'queued' 状态，或 'running' 但已过期（僵尸任务）的任务。
     * 3. 僵尸检测 (Zombie Detection): 利用 Visibility Timeout (5分钟)。如果 running 任务超时未续租，视为 Worker 崩溃，可被抢占。
     * 4. CAS 原子更新: `WHERE version = old_version`，防止并发竞争条件。
     */
    async claimTask(): Promise<TaskRow | null> {
        const now = new Date();
        const nowStr = now.toISOString();

        // [Concurrency Guard: Serial Execution]
        // 意图：主动限流。虽然系统支持并行，但为了规避 LLM API Rate Limit 和降低 DB 负载，
        //       此处强制采用了 "Global Singleton Lock" 策略。
        // 逻辑：只要检测到任何 `locked_until > now` 的 active task，立即放弃本次 Claim。
        const runningValid = await this.db.selectFrom('tasks')
            .selectAll()
            .where('status', '=', 'running')
            .where('locked_until', '>', nowStr)
            .executeTakeFirst();

        if (runningValid) {
            // [Debug] Found running task ${runningValid.id} locked until ${runningValid.locked_until}
            return null;
        }

        // [Candidate Selection Strategy]
        // 优先级：
        // 1. Queued: 正常排队的新任务。
        // 2. Zombie (Running + Expired): 之前 Worker 崩溃遗留的任务。
        //    (利用 `locked_until < now` 判定租约过期，实施 "抢占式恢复")。
        const candidate = await this.db.selectFrom('tasks')
            .selectAll()
            .where((eb) => eb.or([
                eb('status', '=', 'queued'),
                eb.and([
                    eb('status', '=', 'running'),
                    eb('locked_until', '<', nowStr)
                ])
            ]))
            .orderBy('created_at', 'asc')
            .limit(1)
            .executeTakeFirst();

        if (!candidate) return null;

        // 租约期限: 5 分钟 (Visibility Timeout)
        // Worker 必须在 5 分钟内通过 keepAlive 续租，否则会被视为僵尸。
        const limitDate = new Date(now.getTime() + 5 * 60 * 1000); // +5 min
        const lockedUntil = limitDate.toISOString();

        // 乐观锁更新
        await this.db.updateTable('tasks')
            .set({
                status: 'running',
                started_at: nowStr,
                version: (eb) => eb('version', '+', 1),
                locked_until: lockedUntil,
                error_message: null,
                error_context_json: null
            })
            .where('id', '=', candidate.id)
            .where('version', '=', candidate.version) // CAS Check (Compare-And-Swap)
            .executeTakeFirst();

        // [Optimistic Locking w/ CAS]
        // 意图：防止 "TOCTOU" (Time-of-Check to Time-of-Use) 竞争条件。
        // 原理：`WHERE version = old_version`。
        // 结果：若 update 返回 0 rows，说明在查询和更新之间，别的 Worker 已经抢走了该任务 -> 递归重试。

        // 返回更新后的任务数据
        const updated = await this.db.selectFrom('tasks')
            .selectAll()
            .where('id', '=', candidate.id)
            .executeTakeFirst();

        return updated || null;
    }

    /** 标记任务成功完成 */
    async complete(taskId: string) {
        const now = new Date().toISOString();
        await this.db.updateTable('tasks')
            .set({
                status: 'succeeded',
                // result_json: removed
                finished_at: now,
                published_at: now,
                error_message: null,
                error_context_json: null
            })
            .where('id', '=', taskId)
            .execute();
    }

    /** 标记任务失败，记录错误信息供调试 */
    async fail(taskId: string, errorMessage: string, errorContext: Record<string, unknown>) {
        const now = new Date().toISOString();
        // const retryCount = (errorContext.retryCount as number) || 0;

        await this.db.updateTable('tasks')
            .set({
                status: 'failed',
                error_message: errorMessage,
                error_context_json: JSON.stringify(errorContext),
                finished_at: now,
                locked_until: null // 释放锁
            })
            .where('id', '=', taskId)
            .execute();
    }

    /**
     * 保活心跳 (Heartbeat)
     * 延长任务锁的过期时间。
     * 必须定期调用，否则任务会被其他 Worker 视为“僵尸”并抢占重做。
     */
    async keepAlive(taskId: string) {
        const now = Date.now();
        const nextLock = new Date(now + 5 * 60 * 1000).toISOString();

        await this.db.updateTable('tasks')
            .set({ locked_until: nextLock })
            .where('id', '=', taskId)
            .where('status', '=', 'running') // 只有运行中的任务才需要续租
            .execute();

        // Silent update, no logs to avoid noise
    }

    async processQueue() {
        // Visibility Timeout mechanism handles zombies automatically.

        // 循环处理所有可用任务
        while (true) {
            const task = await this.claimTask();
            if (!task) break;

            console.log(`[TaskQueue] Processing task ${task.id} for date ${task.task_date}`);

            try {
                await this.executor.executeTask(task, this); // Pass queue instance for keepAlive
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.error(`[TaskQueue] Task ${task.id} failed:`, message);
                await this.fail(task.id, message, { stage: 'execution' });
            }
        }
    }
}
