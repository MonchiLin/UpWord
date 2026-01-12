/**
 * RSS Feed 生成核心逻辑
 *
 * 支持按难度级别细分的 RSS 订阅。
 */
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { apiFetch } from './api';

export const LEVEL_MAP = { easy: 0, medium: 1, hard: 2 } as const;
export const LEVEL_LABELS = ['Easy', 'Medium', 'Hard'] as const;

type LevelKey = keyof typeof LEVEL_MAP;
type LevelValue = (typeof LEVEL_MAP)[LevelKey];

interface Article {
    id: string;
    title: string;
    slug: string | null;
    publishedAt: string | null;
    createdAt: string;
}

interface DayResponse {
    articles: Article[];
}

interface DaysResponse {
    days: string[];
}

/**
 * 生成 RSS Feed
 *
 * @param context - Astro API 上下文
 * @param filterLevel - 可选，按级别过滤 (0=Easy, 1=Medium, 2=Hard)
 */
export async function generateRssFeed(
    context: APIContext,
    filterLevel?: LevelValue
): Promise<Response> {
    const { days } = await apiFetch<DaysResponse>('/api/days');
    const recentDays = days.slice(0, 20);

    // 并行获取每日文章
    const dayResults = await Promise.all(
        recentDays.map((date) =>
            apiFetch<DayResponse>(`/api/day/${date}`).then((res) => ({
                date,
                articles: res.articles,
            }))
        )
    );

    const items: {
        title: string;
        pubDate: Date;
        link: string;
        description: string;
    }[] = [];

    for (const { date, articles } of dayResults) {
        for (const article of articles) {
            // 每篇文章有 3 个 variant，根据 filterLevel 过滤
            const levels =
                filterLevel !== undefined ? [filterLevel] : [0, 1, 2];

            for (const lvl of levels) {
                const levelLabel = LEVEL_LABELS[lvl];
                const slug = article.slug || article.id;
                items.push({
                    title: `[${levelLabel}] ${article.title}`,
                    pubDate: new Date(
                        article.publishedAt || article.createdAt
                    ),
                    link: `/day/${date}/${slug}?level=${lvl}`,
                    description: `${article.title} - ${levelLabel} 难度`,
                });
            }
        }
    }

    const levelLabel =
        filterLevel !== undefined ? LEVEL_LABELS[filterLevel] : null;

    return rss({
        title: levelLabel ? `UpWord - ${levelLabel}` : 'UpWord - 每日英语阅读',
        description: levelLabel
            ? `UpWord ${levelLabel} 难度文章订阅`
            : '基于 LLM 生成的每日英语阅读平台',
        site: context.site!,
        items,
        customData: '<language>zh-cn</language>',
    });
}
