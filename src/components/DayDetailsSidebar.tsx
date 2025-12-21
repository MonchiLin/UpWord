import { useEffect, useState } from 'react';
import { Button, Modal, Tabs, Tooltip, Divider, Popconfirm, message } from 'antd';
import { BookOpen, Trash2 } from 'lucide-react';
import AdminDayPanel from './AdminDayPanel';

type Article = {
    id: string;
    model: string;
    title: string;
};

type Task = {
    id: string;
    publishedAt: string | null;
};

type PublishedTaskGroup = {
    task: Task;
    articles: Article[];
};

type DayDetailsSidebarProps = {
    date: string | null;
    className?: string;
};

export default function DayDetailsSidebar({ date, className }: DayDetailsSidebarProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ publishedTaskGroups: PublishedTaskGroup[] }>({
        publishedTaskGroups: []
    });
    const [wordsOpen, setWordsOpen] = useState(false);
    const [wordsLoading, setWordsLoading] = useState(false);
    const [newWords, setNewWords] = useState<string[]>([]);
    const [reviewWords, setReviewWords] = useState<string[]>([]);

    useEffect(() => {
        if (!date) return;

        let canceled = false;
        setLoading(true);

        fetch(`/api/day/${date}`)
            .then(res => res.json())
            .then((json: any) => {
                if (canceled) return;
                if (json.error) {
                    // 错误处理：静默还是提示 toast？
                    console.error(json.error);
                    setData({ publishedTaskGroups: [] });
                } else {
                    setData(json);
                }
            })
            .catch(err => {
                console.error(err);
                if (!canceled) setData({ publishedTaskGroups: [] });
            })
            .finally(() => {
                if (!canceled) setLoading(false);
            });

        return () => {
            canceled = true;
        };
    }, [date]);

    useEffect(() => {
        setWordsOpen(false);
        setNewWords([]);
        setReviewWords([]);
    }, [date]);

    async function deleteArticle(articleId: string) {
        const adminKey = localStorage.getItem('luma-words_admin_key');
        if (!adminKey) {
            message.error('请先设置管理员密钥');
            return;
        }

        try {
            const resp = await fetch(`/api/admin/articles/${articleId}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Key': adminKey }
            });
            const json: { ok?: boolean; error?: string } = await resp.json();
            if (!resp.ok) {
                throw new Error(json.error || '删除失败');
            }
            message.success('文章已删除');
            // 更新本地状态，移除该文章
            setData(prev => ({
                ...prev,
                publishedTaskGroups: prev.publishedTaskGroups.map(group => ({
                    ...group,
                    articles: group.articles.filter(a => a.id !== articleId)
                })).filter(group => group.articles.length > 0)
            }));
        } catch (err) {
            message.error(err instanceof Error ? err.message : '删除失败');
        }
    }

    async function openWords() {
        if (!date) return;
        setWordsOpen(true);
        if (wordsLoading || newWords.length > 0 || reviewWords.length > 0) return;
        setWordsLoading(true);
        try {
            const resp = await fetch(`/api/day/${date}/words`);
            const json: any = await resp.json();
            if (!resp.ok) throw new Error(json?.error || 'Failed to load words');
            setNewWords(Array.isArray(json?.new_words) ? json.new_words : []);
            setReviewWords(Array.isArray(json?.review_words) ? json.review_words : []);
        } catch (err) {
            console.error(err);
            setNewWords([]);
            setReviewWords([]);
        } finally {
            setWordsLoading(false);
        }
    }

    if (!date) {
        return (
            <div className={`p-6 bg-stone-50 border-l border-stone-200 h-full overflow-y-auto ${className}`}>
                <div className="flex flex-col items-center justify-center h-full text-stone-400">
                    <p>Select a date to view details</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-stone-50 border-l border-stone-200 text-sm overflow-hidden ${className}`}>
            <div className="p-4 border-b border-stone-200 bg-white">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">
                        <span className="font-mono text-base opacity-70 ml-2">{date}</span>
                    </h2>
                    <Tooltip title="今日单词" placement="bottom">
                        <Button
                            type="text"
                            icon={<BookOpen size={16} className="text-stone-500" />}
                            onClick={openWords}
                        />
                    </Tooltip>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-20 bg-stone-200 rounded-xl"></div>
                        <div className="h-32 bg-stone-200 rounded-xl"></div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <AdminDayPanel date={date} />
                        </div>

                        {data.publishedTaskGroups.length > 0 ? (
                            <div className="space-y-2">
                                {data.publishedTaskGroups.map((group) => (
                                    <div key={group.task.id} className="space-y-1">
                                        {/* 使用 Antd Divider 的时间分隔线 */}
                                        {group.task.publishedAt && (
                                            <Divider plain className="!my-3 !text-[10px] !text-stone-400">
                                                {new Date(group.task.publishedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} 发布
                                            </Divider>
                                        )}

                                        <div className="grid gap-3">
                                            {group.articles.length === 0 ? (
                                                <div className="text-xs text-stone-400 italic text-center">
                                                    (暂无文章)
                                                </div>
                                            ) : (
                                                group.articles.map((a) => (
                                                    <div
                                                        key={a.id}
                                                        className="relative rounded-lg border border-black/5 bg-white p-3 hover:border-black/20 hover:shadow-sm transition-all group/card"
                                                    >
                                                        <a
                                                            href={`/article/${a.id}`}
                                                            className="block"
                                                        >
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div className="text-[10px] font-mono text-stone-400 group-hover/card:text-stone-500">
                                                                    {a.model}
                                                                </div>
                                                            </div>
                                                            <div className="font-medium text-stone-800 group-hover/card:text-black leading-snug pr-6">
                                                                {a.title}
                                                            </div>
                                                        </a>
                                                        <Popconfirm
                                                            title="删除文章"
                                                            description="确定要删除这篇文章吗？此操作不可撤销。"
                                                            onConfirm={(e) => {
                                                                e?.stopPropagation();
                                                                deleteArticle(a.id);
                                                            }}
                                                            okText="删除"
                                                            cancelText="取消"
                                                            okButtonProps={{ danger: true }}
                                                        >
                                                            <button
                                                                className="absolute bottom-2 right-2 p-1 rounded opacity-0 group-hover/card:opacity-100 hover:bg-red-50 text-stone-400 hover:text-red-500 transition-all"
                                                                onClick={(e) => e.preventDefault()}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </Popconfirm>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-sm text-stone-400 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                                还没有发布任何内容
                            </div>
                        )}
                    </>
                )}
            </div>
            <Modal
                title={`当日单词 · ${date}`}
                open={wordsOpen}
                onCancel={() => setWordsOpen(false)}
                footer={null}
                width={720}
            >
                {wordsLoading ? (
                    <div className="py-8 text-center text-sm text-stone-500">加载中...</div>
                ) : newWords.length + reviewWords.length === 0 ? (
                    <div className="py-8 text-center text-sm text-stone-500">暂无单词</div>
                ) : (
                    <Tabs
                        size="small"
                        items={[
                            {
                                key: 'new',
                                label: `新学 (${newWords.length})`,
                                children: (
                                    <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                                        {newWords.map((word) => (
                                            <span
                                                key={word}
                                                className="px-2 py-1 text-xs rounded border border-stone-200 bg-white text-stone-700"
                                            >
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                )
                            },
                            {
                                key: 'review',
                                label: `复习 (${reviewWords.length})`,
                                children: (
                                    <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                                        {reviewWords.map((word) => (
                                            <span
                                                key={word}
                                                className="px-2 py-1 text-xs rounded border border-stone-200 bg-white text-stone-700"
                                            >
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                )
                            }
                        ]}
                    />
                )}
            </Modal>
        </div>
    );
}
