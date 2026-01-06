/**
 * ArticleListClient - 文章列表客户端组件
 * 
 * 订阅 articlesStore，任务完成后自动刷新文章列表。
 * 作为 ArticleList.astro 的客户端接管层：
 * - SSR 首屏由 ArticleList.astro 渲染（SEO 友好）
 * - 客户端 hydration 后由此组件接管（支持动态更新）
 */
import { useStore } from '@nanostores/react';
import { articlesStore } from '../../lib/store/articlesStore';

interface ArticleItemProps {
    id: string;
    title: string;
    index: number;
    isRead?: boolean;
}

function ArticleItem({ id, title, index, isRead = false }: ArticleItemProps) {
    return (
        <article className="group relative border-b border-stone-200 last:border-0 hover:bg-stone-50 -mx-4 px-4 transition-colors cursor-pointer">
            <a href={`/article/${id}`} className="flex items-center py-3 w-full gap-4">
                {/* Number / Checkmark */}
                <span className={`inline-flex items-center justify-center text-xs font-bold font-sans w-6 shrink-0 transition-colors ${isRead ? 'text-amber-600/60' : 'text-stone-300 group-hover:text-stone-500'
                    }`}>
                    {isRead ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        String(index + 1).padStart(2, '0')
                    )}
                </span>

                {/* Title */}
                <h3 className={`inline-flex items-center flex-1 font-serif text-lg font-medium transition-colors truncate pr-4 ${isRead ? 'text-stone-500' : 'text-slate-900 group-hover:text-amber-900'
                    }`}>
                    {title}
                </h3>

                {/* Arrow Icon */}
                <div className="inline-flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0 text-stone-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                </div>
            </a>
        </article>
    );
}

interface ArticleListClientProps {
    /** 当前日期，用于过滤 store 中的数据 */
    date: string;
}

export default function ArticleListClient({ date }: ArticleListClientProps) {
    const state = useStore(articlesStore);

    // 只渲染当前日期的文章
    const articles = state.date === date ? state.articles : [];
    const loading = state.loading;

    return (
        <div className="flex-1">
            {loading && articles.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
                    <span className="font-serif italic text-base text-stone-500">Loading...</span>
                </div>
            ) : articles.length > 0 ? (
                <div className="flex flex-col">
                    {articles.map((article, idx) => (
                        <ArticleItem
                            key={article.id}
                            id={article.id}
                            title={article.title}
                            index={idx}
                            isRead={(article.read_levels || 0) > 0}
                        />
                    ))}
                </div>
            ) : (
                <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
                    <span className="font-serif italic text-base text-stone-500">No content.</span>
                </div>
            )}
        </div>
    );
}
