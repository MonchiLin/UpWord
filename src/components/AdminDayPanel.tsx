import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, RotateCw, Trash2, Play, FileDown } from 'lucide-react';

const ADMIN_KEY_STORAGE = 'luma-words_admin_key';

type TaskRow = {
	id: string;
	taskDate: string;
	type: string;
	triggerSource: string;
	status: string;
	profileId: string;
	profileName: string | null;
	profileTopicPreference: string | null;
	resultJson: string | null;
	errorMessage: string | null;
	errorContextJson: string | null;
	createdAt: string;
	startedAt: string | null;
	finishedAt: string | null;
	publishedAt: string | null;
};

function splitTopicTags(input: string) {
	const parts = input
		.split(/[,，\n;；|]+/g)
		.map((x) => x.trim())
		.filter(Boolean);
	return Array.from(new Set(parts));
}

function formatTime(isoString: string | null) {
	if (!isoString) return '-';
	try {
		return new Date(isoString).toLocaleTimeString('en-GB', { hour12: false }); // 时间格式 HH:mm:ss
	} catch {
		return '-';
	}
}

async function fetchJson(url: string, adminKey: string, init?: RequestInit) {
	const resp = await fetch(url, {
		...init,
		headers: {
			...(init?.headers ?? {}),
			'x-admin-key': adminKey
		}
	});
	const text = await resp.text();
	const data = text ? JSON.parse(text) : null;
	if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
	return data;
}

export default function AdminDayPanel(props: { date: string }) {
	const [adminKey, setAdminKey] = useState<string | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [tasks, setTasks] = useState<TaskRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [collapsed, setCollapsed] = useState(true);

	const canUse = useMemo(() => isAdmin && !!adminKey, [isAdmin, adminKey]);

	// 校验管理员权限
	useEffect(() => {
		try {
			const key = localStorage.getItem(ADMIN_KEY_STORAGE);
			setAdminKey(key && key.trim() ? key.trim() : null);
		} catch {
			setAdminKey(null);
		}
	}, []);

	useEffect(() => {
		if (!adminKey) return;
		let canceled = false;
		(async () => {
			try {
				await fetchJson('/api/admin/check', adminKey);
				if (!canceled) setIsAdmin(true);
			} catch {
				if (!canceled) setIsAdmin(false);
			}
		})();
		return () => {
			canceled = true;
		};
	}, [adminKey]);

	// 加载任务
	async function refresh() {
		if (!adminKey) return;
		// 已有数据时，后台轮询不显示 loading
		if (tasks.length === 0) setLoading(true);
		setError(null);
		try {
			const data = await fetchJson(`/api/admin/tasks?task_date=${encodeURIComponent(props.date)}`, adminKey);
			setTasks((data?.tasks ?? []) as TaskRow[]);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	// 初次加载
	useEffect(() => {
		if (!canUse) return;
		void refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canUse, props.date]);

	// 自动轮询刷新
	useEffect(() => {
		if (!canUse) return;
		const hasActiveTasks = tasks.some(t => t.status === 'running' || t.status === 'queued');
		if (!hasActiveTasks) return;

		const timer = setInterval(() => {
			// 后台刷新，尽量减少闪烁
			fetchJson(`/api/admin/tasks?task_date=${encodeURIComponent(props.date)}`, adminKey!)
				.then(data => setTasks((data?.tasks ?? []) as TaskRow[]))
				.catch(console.error); // 轮询错误静默处理
		}, 3000);

		return () => clearInterval(timer);
	}, [canUse, tasks, adminKey, props.date]);


	async function generate() {
		if (!adminKey) return;
		setLoading(true);
		setError(null);
		try {
			await fetchJson('/api/admin/tasks/generate', adminKey, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ task_date: props.date })
			});
			await refresh();
			setCollapsed(false); // 生成后自动展开
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	async function fetchWords() {
		if (!adminKey) return;
		setLoading(true);
		setError(null);
		try {
			await fetchJson('/api/admin/words/fetch', adminKey, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ task_date: props.date })
			});
			// 是否需要 toast/反馈？
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	async function deleteTask(taskId: string) {
		if (!adminKey) return;
		if (!confirm('确定删除这个任务吗？这会同时删除关联的文章和批注。')) return;
		setLoading(true);
		setError(null);
		try {
			await fetchJson(`/api/admin/tasks/${taskId}/delete`, adminKey, { method: 'POST' });
			await refresh();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	if (!canUse) return null;

	return (
		<div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
			{/* 头部 / 折叠 */}
			<div
				className="flex items-center justify-between p-3 cursor-pointer hover:bg-stone-50 transition-colors select-none"
				onClick={() => setCollapsed(!collapsed)}
			>
				<div className="flex items-center gap-2 text-sm font-medium text-stone-700">
					{collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
					管理员面板
				</div>
				<div className="flex items-center gap-2">
					{loading && <div className="text-xs text-stone-400 animate-pulse">Loading...</div>}
					{!collapsed && (
						<div className="flex gap-1" onClick={e => e.stopPropagation()}>
							<button
								onClick={refresh}
								className="p-1 hover:bg-stone-200 rounded text-stone-500"
								title="Refresh"
							>
								<RotateCw size={14} />
							</button>
						</div>
					)}
				</div>
			</div>

			{/* 折叠内容 */}
			{!collapsed && (
				<div className="p-3 pt-0 border-t border-stone-100 bg-stone-50/50 space-y-4">

					{/* 操作栏 */}
					<div className="flex gap-2">
						<button
							onClick={fetchWords}
							disabled={loading}
							className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded hover:bg-stone-50 disabled:opacity-50"
						>
							<FileDown size={12} />
							抓取单词
						</button>
						<button
							onClick={generate}
							disabled={loading}
							className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 disabled:opacity-50"
						>
							<Play size={12} />
							生成当前
						</button>
					</div>

					{error && (
						<div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 break-all">
							{error}
						</div>
					)}

					{/* 任务列表 */}
					<div className="space-y-3">
						{tasks.length === 0 ? (
							<div className="text-xs text-stone-400 text-center py-2">
								该日暂无任务
							</div>
						) : (
							tasks.map(t => {

								return (
									<div key={t.id} className="bg-white border border-stone-200 rounded-lg p-3 text-xs shadow-sm">
										<div className="flex justify-between items-start gap-2 mb-2">
											<div className="font-medium text-stone-700 truncate max-w-[140px]" title={t.profileName || t.profileId}>
												{t.profileName || 'Unknown Profile'}
											</div>
											<div className="font-mono text-[10px] text-stone-400">
												{formatTime(t.createdAt)}
											</div>
										</div>

										<div className="flex flex-wrap gap-1 mb-2">
											{t.profileTopicPreference && splitTopicTags(t.profileTopicPreference).map(tag => (
												<span key={tag} className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-[10px]">
													{tag}
												</span>
											))}
										</div>

										<div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
											<div className="flex items-center gap-2">
												<span className={clsx(
													"px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider",
													{
														'bg-yellow-100 text-yellow-700': t.status === 'queued',
														'bg-blue-100 text-blue-700': t.status === 'running',
														'bg-green-100 text-green-700': t.status === 'succeeded',
														'bg-red-100 text-red-700': t.status === 'failed',
													}
												)}>
													{t.status}
												</span>
											</div>

											<div className="flex gap-1" onClick={e => e.stopPropagation()}>
												<button
													onClick={() => deleteTask(t.id)}
													disabled={loading}
													className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
													title="删除任务"
												>
													<Trash2 size={14} />
												</button>
											</div>
										</div>

										{t.errorMessage && (
											<div className="mt-2 text-[10px] text-red-600 bg-red-50 p-1.5 rounded">
												{t.errorMessage}
											</div>
										)}
									</div>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
}
