/**
 * [任务执行器 (executor.ts)]
 * ------------------------------------------------------------------
 * 功能：生成任务的总指挥，负责 "选词 -> 扩写 -> 解析 -> 入库" 全流程编排。
 *
 * 核心职责：
 * - 策略路由：区分 "RSS新闻模式" (RSS) 与 "印象模式" (Impression) 的执行路径。
 * - 资源抢占：基于 `locked_until` 实现分布式锁续租 (Keep-Alive)，防止长任务被误判为死锁。
 * - 容错恢复：支持从 `context_json` 恢复断点 (Checkpoint)，避免 LLM 阶段性失败导致的 Token 浪费。
 *
 * 关键约束：
 * - 幂等性：执行前强制清理旧数据 (DeletionService)，防止重试产生脏读。
 * - 隔离性：任务执行期间必须持有 DB 锁，释放锁前无权开启新任务。
 */

import type { AppKysely } from '../../db/factory';
import type { TaskRow } from '../../types/models';
import { env } from '../env';
import { getUsedWordsToday, getRecentTitles, buildCandidateWords, uniqueStrings } from './helpers';

import { createClient, type LLMClientConfig } from '../llm/client';
import { runPipeline, type PipelineCheckpoint } from '../llm/pipeline';
import type { GenerationMode } from '../llm/promptStrategies';
import { DeletionService } from './deletion';

export class TaskExecutor {
    constructor(private db: AppKysely) { }

    async executeTask(task: TaskRow, queue: { keepAlive: (id: string) => Promise<void> }) {
        // [Keep-Alive 机制]
        // 意图：防止 Long-Running Task (平均 3-5min) 因超过 DB 锁默认 TTL (如 1min) 而被误判为 Dead Worker。
        // 实现：每 60s 发送一次心跳，延长 `locked_until` 租约。
        // 风险：若 Worker 进程崩溃 (OOM/Segfault)，定时器停止 -> 锁过期 -> 任务被 Queue 再次分发 (At-least-once)。
        const keepAliveInterval = setInterval(() => {
            queue.keepAlive(task.id).catch(err => console.error(`[Task ${task.id}] Keep-Alive failed:`, err));
        }, 60 * 1000);

        try {
            const isImpressionMode = task.mode === 'impression';

            // 1. 加载生成配置 (Profile)
            // IMPRESSION 模式下 Profile 是可选的 (decoupled)，RSS 模式必须关联 Profile
            let profile;

            if (task.profile_id) {
                profile = await this.db.selectFrom('generation_profiles')
                    .selectAll()
                    .where('id', '=', task.profile_id)
                    .executeTakeFirst();
            }

            // 对于非 Impression 模式，Profile 是必须的
            if (!isImpressionMode && !profile) {
                throw new Error(`Profile not found: ${task.profile_id}`);
            }

            // 2. 候选词策略 (Candidate Strategy)
            // 决策核心: 所有的单词选择逻辑都在这里，Pipeline 只负责执行。
            const generationMode: GenerationMode = isImpressionMode ? 'impression' : 'rss';

            let candidateWordStrings: string[];
            let recentTitles: string[] = [];
            // 提升作用域供最终入库使用
            let newWords: string[] = [];
            let reviewWords: string[] = [];

            if (isImpressionMode) {
                // [Strategy: Impression Mode]
                // 意图：模拟"随机漫步"的阅读体验 (Serendipity)。
                // 区别：不仅不复习旧词，反而故意引入完全随机的生词，打破算法的"回声室效应"。
                // 实现：`ORDER BY RANDOM()` (性能注意: 大表慎用，当前 words 表 < 100k 尚可接受)。
                const randomWords = await this.db
                    .selectFrom('words')
                    .select('word')
                    .orderBy(({ fn }) => fn('random', []))
                    .limit(10)
                    .execute();

                candidateWordStrings = randomWords.map(w => w.word);
                recentTitles = await getRecentTitles(this.db, task.task_date);
                console.log(`[Task ${task.id}] IMPRESSION mode with ${candidateWordStrings.length} runtime candidate words`);
            } else {
                // [Strategy: SRS Mode]
                // 意图：严格遵循"间隔重复" (Spaced Repetition) 算法。
                // 来源：`daily_word_references` 表由外部调度器 (Cron) 预先生成，此处只负责执行。
                // 约束：必须同时包含 New (新学) 和 Review (复习) 两类词，缺一不可。
                const wordRefs = await this.db.selectFrom('daily_word_references')
                    .select(['word', 'type'])
                    .where('date', '=', task.task_date)
                    .execute();

                newWords = uniqueStrings(wordRefs.filter(w => w.type === 'new').map(w => w.word));
                reviewWords = uniqueStrings(wordRefs.filter(w => w.type === 'review').map(w => w.word));

                if (newWords.length + reviewWords.length === 0) {
                    throw new Error('Daily words record is empty');
                }

                // 过滤掉今日已生成的词，避免重复出题
                const usedWords = await getUsedWordsToday(this.db, task.task_date);
                recentTitles = await getRecentTitles(this.db, task.task_date);
                const candidates = buildCandidateWords(newWords, reviewWords, usedWords);

                if (candidates.length === 0) {
                    throw new Error('All words have been used today');
                }

                candidateWordStrings = candidates.map(c => c.word);
            }

            // [Context] 获取关联主题，用于引导 LLM 的选材方向
            let topics: { id: string; label: string; prompts: string | null }[] = [];
            if (profile) {
                topics = await this.db.selectFrom('profile_topics')
                    .innerJoin('topics', 'profile_topics.topic_id', 'topics.id')
                    .select(['topics.id', 'topics.label', 'topics.prompts'])
                    .where('profile_topics.profile_id', '=', profile.id)
                    .where('topics.is_active', '=', 1)
                    .execute();
            }

            // [Filter] 查重机制: 获取已用过的 RSS 链接，防止生成重复新闻
            const usedRssRows = await this.db.selectFrom('articles')
                .select('rss_link')
                .where('rss_link', 'is not', null)
                .execute();
            const excludeRssLinks = usedRssRows.map(r => r.rss_link as string);

            // 3. LLM 客户端配置
            // 优先级: 任务级 override > 环境变量 > 默认Gemini
            // 这种设计允许我们在 Admin 界面针对某次任务临时切换模型。
            const provider = (task.llm || env.LLM_PROVIDER || 'gemini') as 'gemini' | 'openai' | 'claude';
            let clientConfig: LLMClientConfig;

            if (provider === 'openai') {
                if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
                clientConfig = {
                    provider: 'openai',
                    apiKey: env.OPENAI_API_KEY,
                    baseUrl: env.OPENAI_BASE_URL,
                    model: env.OPENAI_MODEL || 'gpt-4'
                };
            } else if (provider === 'claude') {
                if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required');
                clientConfig = {
                    provider: 'claude',
                    apiKey: env.ANTHROPIC_API_KEY,
                    baseUrl: env.ANTHROPIC_BASE_URL,
                    model: env.ANTHROPIC_MODEL || 'claude-3-opus'
                };
            } else {
                if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');
                clientConfig = {
                    provider: 'gemini',
                    apiKey: env.GEMINI_API_KEY,
                    baseUrl: env.GEMINI_BASE_URL,
                    model: env.GEMINI_MODEL || 'gemini-pro'
                };
            }

            console.log(`[Task ${task.id}] Starting generation with Provider: ${provider}, Model: ${clientConfig.model}`);

            // 4. 断点续传 (Checkpoint Recovery)
            // 核心价值: 省钱 & 省时。
            // 如果任务在 Stage 3 失败，重试时直接读取 JSON 里的中间状态，跳过前两阶段昂贵的 API 调用。
            let checkpoint: PipelineCheckpoint | null = null;
            if (task.context_json) {
                const parsed = task.context_json as any;
                const validStages = ['search_selection', 'draft', 'conversion', 'grammar_analysis'];
                if (parsed && typeof parsed === 'object' && 'stage' in parsed && validStages.includes(parsed.stage)) {
                    checkpoint = parsed as PipelineCheckpoint;
                    console.log(`[Task ${task.id}] Resuming from checkpoint: ${checkpoint.stage}`);
                }
            }

            // 5. 执行生成流水线 (The Pipeline)
            // 调用 stateless 的 pipeline 函数，但传入 onCheckpoint 回调来持久化状态。
            // [Fix] Impression 模式下，Topic 由单词聚类动态决定，不能强制使用 Profile 的静态 Topic。
            const topicPreference = isImpressionMode ? '' : topics.map(t => t.label).join(', ');

            const client = createClient(clientConfig);
            const output = await runPipeline({
                client,
                currentDate: task.task_date,
                topicPreference,
                topics: topics.map(t => ({ ...t, prompts: t.prompts || undefined })),
                candidateWords: candidateWordStrings,
                recentTitles,
                excludeRssLinks,
                checkpoint,
                mode: generationMode,
                onCheckpoint: async (cp) => {
                    // [State Persistence]
                    // 每个阶段完成后立即刷写 DB。
                    // 注意: 这里只存 context_json，不改任务状态，任务依然是 "processing"。
                    await this.db.updateTable('tasks')
                        .set({ context_json: JSON.stringify(cp) })
                        .where('id', '=', task.id)
                        .execute();
                    console.log(`[Task ${task.id}] Saved checkpoint: ${cp.stage}`);
                }
            });

            // 6. 幂等性清理 (Idempotency Sweep)
            // 痛点: Drizzle/Kysely 在某些驱动下不处理级联删除，导致残留的 article_paragraphs 报错。
            // 解决方案: 在写入新结果前，显式调用 DeletionService 清理该任务 ID 下的所有旧数据。
            const existingArticles = await this.db.selectFrom('articles')
                .select(['id'])
                .where('generation_task_id', '=', task.id)
                .where('model', '=', clientConfig.model)
                .where('variant', '=', 1)
                .execute();

            if (existingArticles.length > 0) {
                const articleIds = existingArticles.map(a => a.id);
                // 串行删除以降低数据库压力
                for (const id of articleIds) {
                    await DeletionService.deleteArticleWithCascade(id);
                }
                console.log(`[Task ${task.id}] Cleaned up ${existingArticles.length} existing article(s) before retry.`);
            }

            // 7. 持久化存储 (Final Commit)
            const { saveArticleResult } = await import('./saveArticle');
            await saveArticleResult({
                db: this.db,
                result: output,
                taskId: task.id,
                taskDate: task.task_date,
                model: clientConfig.model,
                profileId: profile?.id,
                topicPreference,
                newWords,
                reviewWords
            });

            const finishedAt = new Date().toISOString();

            // 任务成功，释放锁并清除 Checkpoint (不再需要恢复)
            await this.db.updateTable('tasks')
                .set({
                    status: 'succeeded',
                    context_json: null,
                    finished_at: finishedAt,
                    published_at: finishedAt,
                    locked_until: null
                })
                .where('id', '=', task.id)
                .execute();

            console.log(`[Task ${task.id}] Completed successfully`);
        } finally {
            // 无论成功失败，必须清除保活定时器，否则会导致内存泄漏 (Worker 进程不退出)
            clearInterval(keepAliveInterval);
        }
    }
}

