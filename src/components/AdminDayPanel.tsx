import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { type TaskRow, fetchJson } from './admin/shared';
import AdminActions from './admin/AdminActions';
import TaskQueueList from './admin/TaskQueueList';

const ADMIN_KEY_STORAGE = 'luma-words_admin_key';

export default function AdminDayPanel(props: { date: string }) {
	const [adminKey, setAdminKey] = useState<string | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [tasks, setTasks] = useState<TaskRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// 默认不折叠，方便用户直接操作，或者根据用户习惯改为 true
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
	}, [canUse, props.date]);

	// 自动轮询刷新
	useEffect(() => {
		if (!canUse) return;
		const hasActiveTasks = tasks.some(t => t.status === 'running' || t.status === 'queued');
		if (!hasActiveTasks) return;

		const timer = setInterval(() => {
			fetchJson(`/api/admin/tasks?task_date=${encodeURIComponent(props.date)}`, adminKey!)
				.then(data => setTasks((data?.tasks ?? []) as TaskRow[]))
				.catch(console.error);
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
			setCollapsed(false);
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
		<div className="mb-8 border-b border-stone-200 pb-4">
			{/* Header */}
			<button
				className="w-full group flex items-center justify-between py-2 cursor-pointer select-none hover:bg-stone-50 transition-colors -mx-2 px-2 rounded-sm"
				onClick={() => setCollapsed(!collapsed)}
			>
				<div className="flex items-center gap-2 text-xs font-bold text-stone-900 uppercase tracking-widest">
					<span>Admin Controls</span>
					{loading && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
				</div>
				<div className={`transform transition-transform duration-300 text-stone-400 ${!collapsed ? 'rotate-180' : ''}`}>
					<ChevronDown size={14} />
				</div>
			</button>

			{/* Content Body */}
			<div
				className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
			>
				<div className="overflow-hidden">
					<div className="pt-4 space-y-6">
						<AdminActions
							loading={loading}
							onFetchWords={fetchWords}
							onGenerate={generate}
						/>

						{error && (
							<div className="text-xs font-serif text-red-700 bg-red-50 p-3 italic border-l-2 border-red-700">
								Error: {error}
							</div>
						)}

						<TaskQueueList
							tasks={tasks}
							onRefresh={refresh}
							onDelete={deleteTask}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
