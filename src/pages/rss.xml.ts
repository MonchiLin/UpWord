/**
 * RSS Feed - 全量订阅
 *
 * 包含所有难度级别的文章。
 */
import type { APIContext } from 'astro';
import { generateRssFeed } from '@/lib/rss';

export async function GET(context: APIContext) {
    return generateRssFeed(context);
}
