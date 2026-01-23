/**
 * [LLM 生成流水线 (pipeline.ts)]
 * ------------------------------------------------------------------
 * 功能：将非结构化的 AI 生成过程拆解为 4 个原子阶段 (FSM)，实现状态管理。
 *
 * 核心流程 (Stages)：
 * 1. Search & Selection: 决定"写什么" (结合 RSS/Lexicon/Topic)。
 * 2. Draft Generation: 决定"怎么写" (输出纯文本，隔离 JSON 格式风险)。
 * 3. JSON Conversion: 确定性格式化 (Text -> JSON)。
 * 4. Syntax Analysis: 句法分析 (最耗时步骤，支持增量 Checkpoint)。
 *
 * 设计权衡 (Trade-off):
 * - Separation of Concerns: 拒绝 "One Prompt to Rule Them All"。
 *   将 "创意写作" (Stage 2) 与 "格式遵循" (Stage 3) 分离，不仅提升了文笔质量，也降低了 JSON 解析报错率。
 */

import type { LLMClient } from './client';
import type { DailyNewsOutput } from '../../schemas/dailyNews';
import { type ArticleWithAnalysis } from './analyzer';
import type { PipelineConfig, Topic, NewsItem } from './types'; // [Fixed Import]
import { NewsFetcher } from '../news/fetcher';
import { getStrategy, type GenerationMode } from './promptStrategies';

// ============ 类型定义 ============

export interface PipelineCheckpoint {
    stage: 'search_selection' | 'draft' | 'conversion' | 'grammar_analysis';
    selectedWords?: string[];
    newsSummary?: string;
    sourceUrls?: string[];
    selectedRssItem?: NewsItem;
    draftText?: string;
    completedLevels?: ArticleWithAnalysis[];
    usage?: Record<string, any>;
    selectedRssId?: number;
}

// PipelineArgs interface update
export interface PipelineArgs {
    client: LLMClient;
    config?: PipelineConfig;
    currentDate: string;
    topicPreference: string;
    topics?: Topic[];
    candidateWords: string[];
    recentTitles?: string[];
    checkpoint?: PipelineCheckpoint | null;
    onCheckpoint?: (checkpoint: PipelineCheckpoint) => Promise<void>;
    excludeRssLinks?: string[];
    mode?: GenerationMode; // 策略模式：默认 'rss'
}

// ... inside runPipeline ...

export interface PipelineResult {
    output: DailyNewsOutput;
    selectedWords: string[];
    usage: Record<string, any>;
    selectedRssId?: number;
    selectedRssItem?: NewsItem;
}

// ============ 流水线核心逻辑 (Pipeline Core) ============

/**
 * 执行完整的文章生成流水线
 *
 * 逻辑流程:
 * Init -> [Checkpoint Restore] -> Stage 1 (选词) -> Stage 2 (Draft) -> Stage 3 (JSON) -> Stage 4 (NLP) -> Result
 *
 * @param args 包含 LLM 客户端、运行时配置和 Checkpoint 数据
 */
export async function runPipeline(args: PipelineArgs): Promise<PipelineResult> {
    // 状态恢复区
    let selectedWords = args.checkpoint?.selectedWords || [];
    let newsSummary = args.checkpoint?.newsSummary || '';
    let sourceUrls = args.checkpoint?.sourceUrls || [];
    let selectedRssItem = args.checkpoint?.selectedRssItem;
    let draftText = args.checkpoint?.draftText || '';
    let usage: Record<string, any> = args.checkpoint?.usage || {};
    let selectedRssId = args.checkpoint?.selectedRssId;

    // "无状态服务"的有状态启动 (Stateful Resume for Stateless Service)
    // 意图：Worker 可能因为超时、内存泄漏或部署而重启。Pipeline 必须即插即用。
    // 实现：直接从 args.checkpoint.stage 读取上次中断的位置，跳过已完成的步骤。
    const currentStage = args.checkpoint?.stage || 'start';
    const config = args.config || {};

    // 策略模式 (Strategy Pattern)
    // 意图：解耦 "内容源" 与 "生成逻辑"。
    // - RSS Mode: 侧重 factual accuracy，从新闻源提取信息。
    // - Impression Mode: 侧重 creativity，基于抽象词汇进行创意写作。
    // 效果：通过 mode 参数动态切换 System/User Prompts，核心 Pipeline 流程 (4 Stages) 保持不变。
    const strategy = getStrategy(args.mode);



    // [Stage 1] 搜索与选题 (Search & Selection)
    // -----------------------------------------------------------------------
    // 角色: Editor (主编)
    // 目标: 确定"写什么"。
    // 动作:
    // 1. (Optional) 抓取 RSS 实时新闻作为素材。
    // 2. 结合候选词 (Candidates) 和 话题偏好 (Topics)，向 LLM 索要最佳选题。
    // -----------------------------------------------------------------------
    if (currentStage === 'start') {
        // [RSS Fetch] 尝试获取外部新闻，失败不阻断。
        let newsCandidates: NewsItem[] = [];
        try {
            const fetcher = new NewsFetcher();
            const topicIds = args.topics?.map(t => t.id) || [];
            newsCandidates = await fetcher.fetchAggregate(topicIds, args.currentDate, args.excludeRssLinks);
            // console.log(`[Pipeline] Fetched ${newsCandidates.length} news candidates via RSS.`);
        } catch (error) {
            console.warn(`[Pipeline] Failed to fetch RSS news (falling back to pure search):`, error);
        }

        const stage1System = strategy.stage1.system;
        const stage1User = strategy.stage1.buildUser({
            candidateWords: args.candidateWords,
            topicPreference: args.topicPreference,
            currentDate: args.currentDate,
            recentTitles: args.recentTitles,
            topics: args.topics,
            newsCandidates,
        });

        const res = await args.client.runStage1_SearchAndSelection({
            candidateWords: args.candidateWords,
            topicPreference: args.topicPreference,
            currentDate: args.currentDate,
            recentTitles: args.recentTitles,
            topics: args.topics,
            newsCandidates,
            config,
            systemPrompt: stage1System,
            userPrompt: stage1User,
        });

        selectedWords = res.selectedWords;
        newsSummary = res.newsSummary;
        sourceUrls = res.sourceUrls;
        selectedRssId = res.selectedRssId;
        selectedRssItem = res.selectedRssItem;
        usage.search_selection = res.usage;

        console.log(`[Pipeline] Stage 1 Complete. Selected ${selectedWords.length} words.`);

        if (args.onCheckpoint) {
            await args.onCheckpoint({
                stage: 'search_selection',
                selectedWords,
                newsSummary,
                sourceUrls,
                selectedRssId,
                usage
            });
        }
    }

    // [Stage 2] Draft Generation (Writer Role)
    // 意图：聚焦"内容创作"，彻底隔离"格式化"干扰。
    // Trade-off：
    // - 痛点：若强迫 LLM 同时进行 creative writing 和 JSON formatting，往往两头不到岸 (JSON 坏死或文笔干瘪)。
    // - 决策：Stage 2 只输出 Pure Text，解放 LLM 的 Token 算力用于修辞和叙事。格式化留给 Stage 3。
    if (currentStage === 'start' || currentStage === 'search_selection') {
        const stage2System = strategy.stage2.system;
        const stage2User = strategy.stage2.buildUser({
            selectedWords,
            newsSummary,
            sourceUrls,
            currentDate: args.currentDate,
            topicPreference: args.topicPreference,
        });

        const res = await args.client.runStage2_DraftGeneration({
            selectedWords,
            newsSummary,
            sourceUrls,
            currentDate: args.currentDate,
            topicPreference: args.topicPreference,
            config,
            systemPrompt: stage2System,
            userPrompt: stage2User,
        });

        draftText = res.draftText;
        usage.draft = res.usage;

        console.log(`[Pipeline] Stage 2 Complete. Draft: ${draftText.length} chars.`);

        if (args.onCheckpoint) {
            await args.onCheckpoint({
                stage: 'draft',
                selectedWords,
                newsSummary,
                sourceUrls,
                draftText,
                usage
            });
        }
    }

    // [Stage 3] 结构化转换 (JSON Conversion)
    // -----------------------------------------------------------------------
    // 角色: Formatter (排版)
    // 目标: 将纯文本草稿转化为结构化数据 (Level 1/2/3 Variations)。
    // 动作: 接收 Draft Text，要求 LLM 按 JSON Schema 输出。
    // 注意: 此阶段通常耗时较短，属于"确定性变换"。
    // -----------------------------------------------------------------------

    const generation = await args.client.runStage3_JsonConversion({
        draftText,
        sourceUrls,
        selectedWords,
        topicPreference: args.topicPreference,
        config
    });

    console.log(`[Pipeline] Stage 3 Complete. Title: ${generation.output.title}`);
    usage.conversion = generation.usage;

    if (args.onCheckpoint) {
        await args.onCheckpoint({
            stage: 'conversion',
            selectedWords,
            newsSummary,
            sourceUrls,
            draftText,
            usage
        });
    }

    // [Stage 4] Syntax Analysis (Linguist Role)
    // 难点：该步骤最耗时 (60s+)，且生成长 JSON 极易触发 Output Limit 或 Network Error。
    // 策略：Incremental Checkpointing (增量存档)。
    // 机制：利用 `onLevelComplete` 回调，每分析完一个 Level (共3个) 就立即刷写 DB。
    // 收益：Worker 即使在 Level 3 崩溃，重启后 pipeline.ts 会跳过 Level 1/2，直接续跑，实现"断点续传"。
    //   即便 Worker 在中途被杀，下次重启也能从已完成的 Level 接着跑 (断点续传)。
    // -----------------------------------------------------------------------
    if (generation.output.articles && Array.isArray(generation.output.articles) && generation.output.articles.length > 0) {
        const completedFromCheckpoint = args.checkpoint?.completedLevels || [];

        console.log(`[Pipeline] Starting Stage 4 (Sentence Analysis)...`);

        const analysisRes = await args.client.runStage4_SentenceAnalysis({
            articles: generation.output.articles,
            completedLevels: completedFromCheckpoint,
            config,
            onLevelComplete: args.onCheckpoint ? async (completedArticles) => {
                // 增量保存: 即使整个 Stage 4 没跑完，也先把已跑完的 Levels 存下来
                await args.onCheckpoint!({
                    stage: 'grammar_analysis',
                    selectedWords,
                    newsSummary,
                    sourceUrls,
                    draftText,
                    completedLevels: completedArticles as any,
                    usage
                });
            } : undefined
        });

        generation.output.articles = analysisRes.articles as any;
        usage.sentence_analysis = analysisRes.usage;

        console.log(`[Pipeline] Stage 4 Complete.`);

        if (args.onCheckpoint) {
            await args.onCheckpoint({
                stage: 'grammar_analysis',
                selectedWords,
                newsSummary,
                sourceUrls,
                draftText,
                completedLevels: analysisRes.articles as any,
                usage
            });
        }
    }

    return {
        output: generation.output,
        selectedWords,
        selectedRssId,
        selectedRssItem,
        usage
    };
}


