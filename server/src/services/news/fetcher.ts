import Parser from 'rss-parser';
import { db } from '../../db/factory';
import type { NewsItem } from '../llm/types';

/**
 * [RSS 新闻聚合服务 (fetcher.ts)]
 * ------------------------------------------------------------------
 * 功能：负责多源 RSS 的并发抓取、清洗、去重与时效过滤。
 *
 * 核心策略：
 * - 防御性采样 (Defensive Sampling): 对大规模订阅源进行随机切片 (Subset)，防止并发过高导致 IP 被封或 Self-DDoS。
 * - 故障隔离 (Circuit Breaker): 使用 `Promise.allSettled` 确保单源超时不会炸毁整个 Batch。
 * - 时效窗口 (Temporal Window): 严格剔除 `TaskDate - 48h` 之外的旧闻，保证 AI 输入的新鲜度。
 *
 * 外部依赖: rss-parser (XML标准化)
 */
export class NewsFetcher {
    private parser: Parser;

    // Circuit Breaker Config:
    // Limits upstream requests to avoid self-DDoS during mass generation.
    private static MAX_SOURCES_PER_FETCH = 20;
    private static FETCH_TIMEOUT_MS = 5000;
    private static MAX_ITEMS_TO_RETURN = 20;

    constructor() {
        this.parser = new Parser({
            timeout: NewsFetcher.FETCH_TIMEOUT_MS,
            headers: { 'User-Agent': 'ApertureDaily/1.0 (NewsAggregator)' }
        });
    }

    /**
     * 获取聚合新闻列表
     * @param topicIds - 关联的主题 ID 列表。如果为空，则尝试获取通用源。
     * @param taskDate - 目标生成日期 (YYYY-MM-DD)，用于时效过滤。如果为空则使用当前时间。
     * @param excludeLinks - 已使用的 RSS 链接列表，用于去重。
     */
    async fetchAggregate(
        topicIds: string[] = [],
        taskDate?: string,
        excludeLinks?: string[]
    ): Promise<NewsItem[]> {
        console.log(`[NewsFetcher] Starting aggregation for topics: [${topicIds.join(', ')}], taskDate: ${taskDate || 'now'}, excludeLinks: ${excludeLinks?.length || 0}`);

        // 1. 获取目标 RSS 源列表
        const sources = await this.getSourcesForTopics(topicIds);

        if (sources.length === 0) {
            console.warn('[NewsFetcher] No active sources found for these topics.');
            return [];
        }

        // 2. Defensive Sampling
        // Randomly subsets large source pools to maintain consistent performance (O(N) -> O(Constant)).
        const selectedSources = this.sampleSources(sources);
        console.log(`[NewsFetcher] Selected ${selectedSources.length} sources for fetching (pool size: ${sources.length}).`);

        // 3. Concurrent Execution Strategy
        // 意图：全并发执行，最大化利用 I/O 带宽。
        // 容错：使用 allSettled 而非 all。
        // 理由：RSS 源极其不稳定，允许部分失败是系统设计的基石，而非异常情况。
        const fetchPromises = selectedSources.map(source => this.fetchSingleSource(source, taskDate));
        const results = await Promise.allSettled(fetchPromises);

        // 4. 结果汇总与清洗
        let allItems: NewsItem[] = [];
        let successCount = 0;
        let failCount = 0;

        for (const res of results) {
            if (res.status === 'fulfilled') {
                allItems.push(...res.value);
                successCount++;
            } else {
                failCount++;
                // 仅在调试模式下打印详细错误，生产环境保持日志整洁
                // console.debug('[NewsFetcher] Source failed:', res.reason);
            }
        }

        console.log(`[NewsFetcher] Fetch complete. Success: ${successCount}, Failed: ${failCount}. Total items: ${allItems.length}`);

        // 5. 排序与截断 (Ranking & Truncation)
        // 按发布时间倒序排列，取最新的 N 条
        const sortedItems = allItems
            .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
            .slice(0, NewsFetcher.MAX_ITEMS_TO_RETURN);

        // 6. 排除已使用的链接 (Deduplication)
        const excludeSet = new Set(excludeLinks || []);
        const filteredItems = sortedItems.filter(item => !excludeSet.has(item.link));

        if (excludeLinks && excludeLinks.length > 0) {
            console.log(`[NewsFetcher] Excluded ${sortedItems.length - filteredItems.length} already-used RSS links.`);
        }

        return filteredItems;
    }

    /**
     * 根据 Topic 获取源定义 (DB Layer)
     */
    private async getSourcesForTopics(topicIds: string[]) {
        if (topicIds.length === 0) {
            // 如果没有指定 Topic，策略：
            // 暂时策略：只返回那些有了 "General" 标记或者未绑定 Topic 的源
            // 但为了从简，当前若无 Topic 则只返回明确未绑定的源 (topic_id IS NULL)
            // 用户体验优化：如果没有 Topic，可能是在测试，或者通用文章
            return await db.selectFrom('news_sources')
                .select(['id', 'name', 'url'])
                .where('is_active', '=', 1)
                // .where(...) // 可以在此添加 "通用源" 逻辑
                .execute();
        }

        // 查询绑定了这些 Topic 的源
        // 使用 DISTINCT 防止同一源被多个 Topic 绑定时重复出现
        return await db.selectFrom('news_sources as ns')
            .innerJoin('topic_sources as ts', 'ts.source_id', 'ns.id')
            .select(['ns.id', 'ns.name', 'ns.url'])
            .where('ts.topic_id', 'in', topicIds)
            .where('ns.is_active', '=', 1)
            .groupBy('ns.id') // 去重
            .execute();
    }

    /**
     * 随机采样源 (Utils)
     */
    private sampleSources<T>(sources: T[]): T[] {
        if (sources.length <= NewsFetcher.MAX_SOURCES_PER_FETCH) {
            return sources;
        }
        // Shuffle (Fisher-Yates) - 简单随机打乱
        const shuffled = [...sources].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, NewsFetcher.MAX_SOURCES_PER_FETCH);
    }

    /**
     * Fetch Single RSS Feed
     * Wraps parser.parseURL with timeout handling and normalization.
     */
    private async fetchSingleSource(source: { id: string; name: string; url: string }, taskDate?: string): Promise<NewsItem[]> {
        try {
            const feed = await this.parser.parseURL(source.url);

            // 简单的校验，确保有 items
            if (!feed.items || feed.items.length === 0) {
                return [];
            }

            // 提取并标准化数据
            // 只取每个源最新的 5 条，避免单个大源淹没其他源
            const items: NewsItem[] = feed.items.slice(0, 5).map(item => ({
                sourceId: source.id, // [NEW]
                sourceName: source.name,
                title: item.title?.trim() || 'Untitled',
                link: item.link || '',
                summary: item.contentSnippet || item.summary || '', // 优先用纯文本摘要
                pubDate: item.pubDate || new Date().toISOString()
            })).filter(item => item.title && item.link); // 过滤无效数据

            // Temporal Filtering Strategy:
            // Since RSS feeds often contain old items, we strictly filter validation window.
            // Window: [TargetDate - 48h, TargetDate]
            const referenceDate = taskDate ? new Date(taskDate).getTime() : Date.now();
            const twoDaysAgo = referenceDate - 48 * 60 * 60 * 1000;
            const recentItems = items.filter(item => {
                const pubTime = new Date(item.pubDate).getTime();
                return pubTime > twoDaysAgo;
            });

            // console.log(`[NewsFetcher] Parsed ${source.name} in ${Date.now() - start}ms. Found ${recentItems.length} recent items.`);
            return recentItems;

        } catch (error) {
            // console.warn(`[NewsFetcher] Failed to fetch ${source.name} (${source.url}): ${(error as Error).message}`);
            // 抛出错误以便 Promise.allSettled 捕获为 rejected
            throw error;
        }
    }
}
