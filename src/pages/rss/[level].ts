/**
 * RSS Feed - 按难度级别订阅
 *
 * 动态路由：/rss/easy.xml, /rss/medium.xml, /rss/hard.xml
 */
import type { APIContext } from 'astro';
import { generateRssFeed, LEVEL_MAP } from '@/lib/rss';

type LevelKey = keyof typeof LEVEL_MAP;

export async function GET(context: APIContext) {
    const levelParam = context.params.level as string;
    const levelKey = levelParam.replace('.xml', '') as LevelKey;

    if (!(levelKey in LEVEL_MAP)) {
        return new Response('Not Found', { status: 404 });
    }

    return generateRssFeed(context, LEVEL_MAP[levelKey]);
}
