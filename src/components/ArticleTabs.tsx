import { Cross2Icon, MagicWandIcon, Pencil2Icon } from '@radix-ui/react-icons';
import { Button, Input } from 'antd'; // 引入 Antd 组件
import { forwardRef, lazy, memo, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArticleReader } from './ArticleReader';

const { TextArea } = Input

const LazyAIChatSidebar = lazy(() => import('./AIChatSidebar').then((m) => ({ default: m.AIChatSidebar })));

const ArticleContent = memo(
	forwardRef<HTMLDivElement, { content: string }>(function ArticleContent(props, ref) {
		return (
			<div ref={ref} className="whitespace-pre-wrap leading-relaxed">
				{props.content}
			</div>
		);
	})
);
ArticleContent.displayName = 'ArticleContent';

type Level = 1 | 2 | 3;

type ArticleLevel = {
	level: Level;
	level_name: string;
	content: string;
	difficulty_desc: string;
};

type ArticleTabsProps = {
	articleId: string;
	articles: ArticleLevel[];
	initialIsAdmin?: boolean;
	title?: string;
	dateLabel?: string;
	reads?: number | null;
	sourceAnchorId?: string | null;
	targetWords?: string[];
};

const ADMIN_KEY_STORAGE = 'luma-words_admin_key';
const WORDS_PER_MINUTE = 120;

type HighlightItem = {
	id: string;
	start_meta: any;
	end_meta: any;
	text: string;
	note: string | null;
	style: any | null;
};

type Rect = {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

type Placement = 'top' | 'bottom';

type SelectionUiState = {
	rect: Rect;
	text: string;
	placement: Placement;
};

type NoteEditorState =
	| {
		mode: 'create';
		articleId: string;
		level: Level;
		anchor: Rect;
		placement: Placement;
		source: { id: string; start_meta: any; end_meta: any; text: string };
	}
	| {
		mode: 'edit';
		articleId: string;
		id: string;
		anchor: Rect;
		placement: Placement;
		text: string;
		note: string | null;
	};

// Use environment variable for API URL
const API_BASE = import.meta.env.PUBLIC_API_BASE || "http://localhost:3000";

async function fetchHighlights(articleId: string) {
	const resp = await fetch(`${API_BASE}/api/articles/${encodeURIComponent(articleId)}/highlights`);
	const text = await resp.text();
	const data = text ? JSON.parse(text) : null;
	if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
	return (data ?? []) as HighlightItem[];
}

async function checkAdminSession(adminKey: string) {
	try {
		const resp = await fetch(`${API_BASE}/api/auth/check`, {
			headers: { 'x-admin-key': adminKey }
		});
		return resp.ok;
	} catch {
		return false;
	}
}

// Unused legacy login function removed or kept? 
// SettingsPanel uses direct call now. This file doesn't need login, only check.
// I'll keep a placeholder or remove it.
// The original file used loginAdmin in useEffect, I need to check that usage later.
// For now, I'll update signature.

// Actually, I should update adminFetchJson next.

async function adminFetchJson(url: string, adminKey: string | null, init?: RequestInit) {
	const resp = await fetch(url, {
		...init,
		// credentials: 'same-origin', // No longer needed for backend
		headers: {
			...(init?.headers ?? {}),
			...(adminKey ? { 'x-admin-key': adminKey } : {})
		}
	});
	const text = await resp.text();
	// Verify JSON validity
	try {
		const data = text ? JSON.parse(text) : null;
		if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);
		return data;
	} catch {
		// If not json (maybe 200 OK empty), return null
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		return null;
	}
}

function getHighlightLevel(style: any | null): Level | null {
	const n = style?.level;
	if (n === 1 || n === 2 || n === 3) return n;
	return null;
}

function toRect(r: DOMRect): Rect {
	return {
		left: r.left,
		top: r.top,
		right: r.right,
		bottom: r.bottom,
		width: r.width,
		height: r.height
	};
}

function pickPlacement(rect: Rect): Placement {
	const spaceAbove = rect.top;
	const spaceBelow = window.innerHeight - rect.bottom;
	return spaceAbove >= 72 || spaceAbove >= spaceBelow ? 'top' : 'bottom';
}

function getSelectionInRoot(root: HTMLElement): { range: Range; rect: Rect; text: string } | null {
	const sel = window.getSelection();
	if (!sel || sel.rangeCount === 0) return null;
	const range = sel.getRangeAt(0);
	const rawText = sel.toString();
	const text = rawText.trim();
	if (!text) return null;

	const start = range.startContainer;
	const end = range.endContainer;
	if (!root.contains(start) || !root.contains(end)) return null;

	const rect = range.getBoundingClientRect();
	if (!rect || (rect.width === 0 && rect.height === 0)) return null;

	return { range, rect: toRect(rect), text };
}

function getEventPointRect(e: MouseEvent | TouchEvent): Rect | null {
	if ('touches' in e) {
		const t = e.touches[0] ?? e.changedTouches[0];
		if (!t) return null;
		const { clientX: left, clientY: top } = t;
		return { left, top, right: left, bottom: top, width: 0, height: 0 };
	}
	const me = e as MouseEvent;
	return { left: me.clientX, top: me.clientY, right: me.clientX, bottom: me.clientY, width: 0, height: 0 };
}

import { setPlaylist } from '../lib/store/audioStore';

export default function ArticleTabs(props: ArticleTabsProps) {
	const sorted = useMemo(() => [...props.articles].sort((a, b) => a.level - b.level), [props.articles]);
	const [level, setLevel] = useState<Level>((sorted[0]?.level ?? 1) as Level);
	const current = sorted.find((a) => a.level === level) ?? sorted[0];

	const contentRef = useRef<HTMLDivElement | null>(null);
	const highlighterRef = useRef<any>(null);
	const appliedIdsRef = useRef<Set<string>>(new Set());
	const highlightsRef = useRef<HighlightItem[]>([]);
	const selectionRangeRef = useRef<Range | null>(null);
	const overlayRef = useRef<HTMLDivElement | null>(null);

	const [adminKey, setAdminKey] = useState<string | null>(null);
	const [isAdmin, setIsAdmin] = useState(Boolean(props.initialIsAdmin));
	const [highlights, setHighlights] = useState<HighlightItem[]>([]);
	const [hlInstanceToken, setHlInstanceToken] = useState(0);

	const [portalReady, setPortalReady] = useState(false);
	const [selectionUi, setSelectionUi] = useState<SelectionUiState | null>(null);
	const [noteEditor, setNoteEditor] = useState<NoteEditorState | null>(null);
	const [noteDraft, setNoteDraft] = useState('');
	const [noteSaving, setNoteSaving] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [analyzeSelection, setAnalyzeSelection] = useState<{ selectionText: string; article: string } | null>(null);

	useEffect(() => {
		highlightsRef.current = highlights;
	}, [highlights]);

	useEffect(() => {
		setPortalReady(true);
	}, []);

	useEffect(() => {
		try {
			const key = localStorage.getItem(ADMIN_KEY_STORAGE);
			setAdminKey(key && key.trim() ? key.trim() : null);
		} catch {
			setAdminKey(null);
		}
	}, []);

	useEffect(() => {
		let canceled = false;
		(async () => {
			try {
				const hasSession = await checkAdminSession();
				if (canceled) return;
				if (hasSession) {
					setIsAdmin(true);
					return;
				}
				if (!adminKey) {
					setIsAdmin(false);
					return;
				}
				const ok = await loginAdmin(adminKey);
				if (!canceled) setIsAdmin(ok);
			} catch {
				if (!canceled) setIsAdmin(false);
			}
		})();
		return () => {
			canceled = true;
		};
	}, [adminKey]);

	async function refreshHighlights() {
		try {
			const rows = await fetchHighlights(props.articleId);
			setHighlights(rows);
		} catch (e) {
			console.error((e as Error).message);
		}
	}

	useEffect(() => {
		void refreshHighlights();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.articleId]);

	useEffect(() => {
		closeFloatingUi();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.articleId]);

	function closeSelectionUi() {
		selectionRangeRef.current = null;
		setSelectionUi(null);
	}

	function closeNoteEditor(options?: { cancelCreateHighlight?: boolean }) {
		const cancelCreateHighlight = options?.cancelCreateHighlight ?? true;
		if (cancelCreateHighlight && noteEditor?.mode === 'create') {
			highlighterRef.current?.remove(noteEditor.source.id);
			appliedIdsRef.current.delete(noteEditor.source.id);
		}
		setNoteEditor(null);
		setNoteDraft('');
		setNoteSaving(false);
	}

	function closeFloatingUi() {
		closeSelectionUi();
		closeNoteEditor();
	}

	useEffect(() => {
		const el = contentRef.current;
		if (!el) return;

		let canceled = false;
		let inst: any | null = null;

		highlighterRef.current?.dispose?.();
		highlighterRef.current = null;
		appliedIdsRef.current = new Set();
		selectionRangeRef.current = null;

		(async () => {
			try {
				// web-highlighter 依赖稳定的文章 DOM；避免改动结构。
				const mod = await import('web-highlighter');
				const Highlighter = (mod as any).default ?? mod;
				if (canceled) return;

				inst = new Highlighter({
					$root: el,
					exceptSelectors: ['pre', 'code']
				});

				if (canceled) {
					inst?.dispose?.();
					return;
				}

				highlighterRef.current = inst;
				setHlInstanceToken((n) => n + 1);

				if (isAdmin) {
					const clickEvent = (Highlighter as any)?.event?.CLICK ?? 'click';
					inst.on(clickEvent, ({ id }: any, _h: any, e: any) => {
						const ev = e as MouseEvent | TouchEvent;
						const asMouse = ev as MouseEvent;
						const currentHighlight = highlightsRef.current.find((h) => h.id === id) ?? null;

						if ('shiftKey' in asMouse && asMouse.shiftKey) {
							if (!window.confirm('删除该批注？')) return;
							(async () => {
								try {
									await adminFetchJson(`${API_BASE}/api/highlights/${encodeURIComponent(id)}`, adminKey, { method: 'DELETE' });
									highlighterRef.current?.remove?.(id);
									appliedIdsRef.current.delete(id);
									setHighlights((prev) => prev.filter((h) => h.id !== id));
								} catch (err) {
									console.error((err as Error).message);
								}
							})();
							return;
						}

						const anchor = getEventPointRect(ev) ?? { left: 16, top: 16, right: 16, bottom: 16, width: 0, height: 0 };
						const placement = pickPlacement(anchor);
						closeSelectionUi();
						setNoteDraft(currentHighlight?.note ?? '');
						setNoteEditor({
							mode: 'edit',
							articleId: props.articleId,
							id,
							anchor,
							placement,
							text: currentHighlight?.text ?? '',
							note: currentHighlight?.note ?? null
						});
					});
				}
			} catch (err) {
				if (!canceled) console.error((err as Error).message);
			}
		})();

		return () => {
			canceled = true;
			if (inst) {
				inst.dispose?.();
				if (highlighterRef.current === inst) highlighterRef.current = null;
			}
			appliedIdsRef.current = new Set();
			selectionRangeRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.articleId, level, isAdmin, adminKey]);

	useEffect(() => {
		const root = contentRef.current;
		if (!root) return;
		if (!isAdmin) {
			closeFloatingUi();
			return;
		}

		let raf = 0;
		const scheduleUpdate = () => {
			if (raf) cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				if (noteEditor) return;
				const info = getSelectionInRoot(root);
				if (!info) {
					closeSelectionUi();
					return;
				}
				selectionRangeRef.current = info.range.cloneRange();
				setSelectionUi({
					rect: info.rect,
					text: info.text,
					placement: pickPlacement(info.rect)
				});
			});
		};

		const onPointerUp = () => scheduleUpdate();
		const onKeyUp = () => scheduleUpdate();

		root.addEventListener('pointerup', onPointerUp);
		document.addEventListener('keyup', onKeyUp);

		return () => {
			if (raf) cancelAnimationFrame(raf);
			root.removeEventListener('pointerup', onPointerUp);
			document.removeEventListener('keyup', onKeyUp);
		};
	}, [isAdmin, noteEditor]);

	useEffect(() => {
		if (!isAdmin) return;
		if (!selectionUi && !noteEditor) return;

		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Node | null;
			const overlay = overlayRef.current;
			if (target && overlay && overlay.contains(target)) return;

			if (noteEditor?.mode === 'create') closeNoteEditor({ cancelCreateHighlight: true });
			else closeNoteEditor({ cancelCreateHighlight: false });
			closeSelectionUi();
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			if (noteEditor?.mode === 'create') closeNoteEditor({ cancelCreateHighlight: true });
			else closeNoteEditor({ cancelCreateHighlight: false });
			closeSelectionUi();
		};

		const onScrollOrResize = () => {
			// 布局变化时关闭浮层，避免位置失效。
			if (noteEditor?.mode === 'create') closeNoteEditor({ cancelCreateHighlight: true });
			else closeNoteEditor({ cancelCreateHighlight: false });
			closeSelectionUi();
		};

		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKeyDown);
		window.addEventListener('resize', onScrollOrResize);
		window.addEventListener('scroll', onScrollOrResize, true);

		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('resize', onScrollOrResize);
			window.removeEventListener('scroll', onScrollOrResize, true);
		};
	}, [isAdmin, selectionUi, noteEditor]);

	useEffect(() => {
		const inst = highlighterRef.current;
		if (!inst) return;

		for (const h of highlights) {
			const hlLevel = getHighlightLevel(h.style);
			if (hlLevel !== null && hlLevel !== level) continue;
			if (appliedIdsRef.current.has(h.id)) continue;
			inst.fromStore(h.start_meta, h.end_meta, h.text, h.id);
			appliedIdsRef.current.add(h.id);
		}
	}, [highlights, level, hlInstanceToken]);

	async function startCreateNote() {
		if (!isAdmin) return;
		const inst = highlighterRef.current;
		const range = selectionRangeRef.current;
		if (!inst || !range || !selectionUi) return;

		setNoteSaving(false);

		const source = inst.fromRange(range as Range) as any;
		if (!source?.id) return;

		appliedIdsRef.current.add(source.id);
		window.getSelection()?.removeAllRanges();
		closeSelectionUi();
		setNoteDraft('');
		setNoteEditor({
			mode: 'create',
			articleId: props.articleId,
			level,
			anchor: selectionUi.rect,
			placement: selectionUi.placement,
			source: {
				id: source.id,
				start_meta: source.startMeta,
				end_meta: source.endMeta,
				text: source.text
			}
		});
	}

	function dispatchAnalyzeSelection() {
		if (!isAdmin) return;
		if (!selectionUi) return;
		const selectionText = selectionUi.text.trim();
		if (!selectionText) return;

		window.getSelection()?.removeAllRanges();
		closeSelectionUi();
		setAnalyzeSelection({ selectionText, article: current?.content ?? '' });
		setChatOpen(true);
	}

	async function saveNote() {
		if (!isAdmin || !noteEditor) return;
		if (noteSaving) return;

		const nextNote = noteDraft.trim() ? noteDraft.trim() : null;
		setNoteSaving(true);

		try {
			if (noteEditor.mode === 'create') {
				// Use backend API for creation
				await adminFetchJson(`${API_BASE}/api/highlights`, adminKey, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						articleId: noteEditor.articleId, // Backend expects separate articleId
						id: noteEditor.source.id,
						start_meta: noteEditor.source.start_meta,
						end_meta: noteEditor.source.end_meta,
						text: noteEditor.source.text,
						note: nextNote,
						style: { level: noteEditor.level }
					})
				});
				await refreshHighlights();
				closeNoteEditor({ cancelCreateHighlight: false });
			} else {
				// Use backend API for update (PUT preferred for full resource, or PATCH if supported)
				// Backend implementation uses PUT /api/highlights/:id for updates
				await adminFetchJson(`${API_BASE}/api/highlights/${encodeURIComponent(noteEditor.id)}`, adminKey, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ note: nextNote })
				});
				setHighlights((prev) => prev.map((h) => (h.id === noteEditor.id ? { ...h, note: nextNote } : h)));
				closeNoteEditor({ cancelCreateHighlight: false });
			}
		} catch (err) {
			console.error((err as Error).message);
		} finally {
			setNoteSaving(false);
		}
	}

	const wordStats = useMemo(() => {
		const text = current?.content ?? '';
		const words = text.trim().split(/\s+/).filter(Boolean);
		const count = words.length;
		const minutes = count ? Math.max(1, Math.ceil(count / WORDS_PER_MINUTE)) : 0;
		return { count, minutes };
	}, [current?.content]);


	// const wordLabel = wordStats.count === 1 ? 'word' : 'words';
	const minuteLabel = wordStats.minutes === 1 ? 'minute' : 'minutes';

	const contentParagraphs = useMemo(() => {
		// Clean text: remove newlines/extra spaces within paragraphs to ensure smooth TTS flow
		// and consistent charIndex alignment.
		return current?.content?.split('\n')
			.filter((p: string) => p.trim().length > 0)
			.map((p) => p.replace(/\s+/g, ' ').trim()) || [];
	}, [current?.content]);

	// Sync playlist to audio store
	useEffect(() => {
		if (contentParagraphs.length > 0) {
			setPlaylist(contentParagraphs);
		}
	}, [contentParagraphs]);

	return (
		<div className="relative">
			<div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8">
				<ArticleReader
					id={props.articleId}
					title={props.title || ''}
					publishDate={props.dateLabel || ''}
					stats={{
						wordCount: wordStats.count,
						readingTime: `${wordStats.minutes} ${minuteLabel}`,
						readCount: props.reads || 0
					}}
					level={level}
					content={contentParagraphs}
					targetWords={props.targetWords ?? []}
					onLevelChange={(newLevel) => {
						closeFloatingUi();
						setLevel(newLevel);
					}}
					contentRef={contentRef}
				/>
			</div>

			{/* 管理员 / 高亮 UI 覆盖层 */}
			{/* 其余 portal 逻辑保持不变 */}


			{
				portalReady && isAdmin
					? createPortal(
						<div ref={overlayRef} className="pointer-events-none fixed inset-0 z-50">
							{selectionUi && !noteEditor ? (
								<div
									className="pointer-events-auto"
									style={{
										position: 'fixed',
										left: selectionUi.rect.left + selectionUi.rect.width / 2,
										top: selectionUi.placement === 'top' ? selectionUi.rect.top : selectionUi.rect.bottom,
										transform: selectionUi.placement === 'top' ? 'translate(-50%, calc(-100% - 8px))' : 'translate(-50%, 8px)'
									}}
								>
									<div className="flex items-center gap-1 rounded-full border border-black/10 bg-white/80 p-1 shadow-lg backdrop-blur">
										<button
											type="button"
											className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
											title="标注"
											onClick={startCreateNote}
										>
											<Pencil2Icon />
										</button>
										<button
											type="button"
											className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
											title="解析"
											onClick={dispatchAnalyzeSelection}
										>
											<MagicWandIcon />
										</button>
									</div>
								</div>
							) : null}

							{noteEditor ? (
								<div
									className="pointer-events-auto"
									style={{
										position: 'fixed',
										left: noteEditor.anchor.left + (noteEditor.anchor.width ? noteEditor.anchor.width / 2 : 0),
										top: noteEditor.placement === 'top' ? noteEditor.anchor.top : noteEditor.anchor.bottom,
										transform: noteEditor.placement === 'top' ? 'translate(-50%, calc(-100% - 10px))' : 'translate(-50%, 10px)',
										width: 'min(420px, calc(100vw - 24px))'
									}}
								>
									<div className="rounded-xl border border-black/10 bg-white/90 p-2 shadow-lg backdrop-blur">
										<div className="grid grid-cols-[1fr_auto] items-start gap-2">
											<TextArea
												placeholder="备注…"
												value={noteDraft}
												onChange={(e) => setNoteDraft(e.target.value)}
												rows={3}
											/>
											<button
												type="button"
												className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-black/5 hover:text-gray-900"
												title="关闭"
												onClick={() => (noteEditor.mode === 'create' ? closeNoteEditor({ cancelCreateHighlight: true }) : closeNoteEditor({ cancelCreateHighlight: false }))}
											>
												<Cross2Icon />
											</button>
										</div>

										<div className="flex justify-between gap-2 mt-2">
											{noteEditor.mode === 'edit' && <Button onClick={async () => {
												try {
													await adminFetchJson(`/api/admin/highlights/${encodeURIComponent(noteEditor.id)}`, adminKey, { method: 'DELETE' });
													highlighterRef.current?.remove?.(noteEditor.id);
													appliedIdsRef.current.delete(noteEditor.id);
													setHighlights((prev) => prev.filter((h) => h.id !== noteEditor.id));
													closeNoteEditor({ cancelCreateHighlight: false });
												} catch (err) {
													console.error((err as Error).message);
												}
											}} size="small" danger>
												Delete
											</Button>
											}
											<div className="flex justify-end gap-2 ml-auto">
												<Button size="small" onClick={() => closeNoteEditor({ cancelCreateHighlight: noteEditor.mode === 'create' })} disabled={noteSaving}>
													Cancel
												</Button>
												<Button size="small" type="primary" onClick={saveNote} loading={noteSaving} style={{ backgroundColor: '#ea580c' }}>
													Save
												</Button>
											</div>
										</div>
									</div>
								</div>
							) : null}
						</div>,
						document.body
					)
					: null
			}

			{
				isAdmin && chatOpen ? (
					<Suspense fallback={null}>
						<LazyAIChatSidebar isOpen onClose={() => setChatOpen(false)} analyzeSelection={analyzeSelection} />
					</Suspense>
				) : null
			}
		</div >
	);
}
