import { Pencil1Icon, PlusIcon, ReloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Button, Flex, Table, Text, TextArea, TextField } from '@radix-ui/themes';
import { Modal, Input } from 'antd';
import { useEffect, useMemo, useState } from 'react';

type GenerationProfile = {
	id: string;
	name: string;
	topic_preference: string;
	model_setting: unknown;
	concurrency: number;
	timeout_ms: number;
	created_at: string;
	updated_at: string;
};

type ProfileDraft = {
	id: string | null;
	name: string;
	topic_preference: string;
	model_setting_json: string;
	concurrency: string;
	timeout_ms: string;
};

async function adminFetchJson(url: string, adminKey: string, init?: RequestInit) {
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

function safeStringify(value: unknown) {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return '';
	}
}

function summarizeModelSetting(modelSetting: unknown) {
	const model = (modelSetting as any)?.model;
	return typeof model === 'string' && model.trim() ? model.trim() : '-';
}

function splitTopicTags(input: string) {
	const parts = input
		.split(/[,，\n;；|]+/g)
		.map((x) => x.trim())
		.filter(Boolean);
	return Array.from(new Set(parts));
}

const DEFAULT_MODEL_SETTING = `{
  "model": "gpt-5.2"
}`;

function buildEmptyDraft(): ProfileDraft {
	return {
		id: null,
		name: '',
		topic_preference: '',
		model_setting_json: DEFAULT_MODEL_SETTING,
		concurrency: '1',
		timeout_ms: '1800000'
	};
}

function draftFromProfile(p: GenerationProfile): ProfileDraft {
	return {
		id: p.id,
		name: p.name,
		topic_preference: p.topic_preference,
		model_setting_json: safeStringify(p.model_setting),
		concurrency: String(p.concurrency),
		timeout_ms: String(p.timeout_ms)
	};
}

function parseJsonField(label: string, raw: string) {
	try {
		return { ok: true as const, value: JSON.parse(raw) as unknown };
	} catch (e) {
		return { ok: false as const, message: `${label} 不是合法 JSON：${(e as Error).message}` };
	}
}

export default function ProfilesPanel(props: { adminKey: string }) {
	const adminKey = props.adminKey;

	const [profiles, setProfiles] = useState<GenerationProfile[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [editorOpen, setEditorOpen] = useState(false);
	const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
	const [draft, setDraft] = useState<ProfileDraft>(() => buildEmptyDraft());
	const [deleteTarget, setDeleteTarget] = useState<GenerationProfile | null>(null);

	const rows = useMemo(() => [...profiles].sort((a, b) => a.name.localeCompare(b.name)), [profiles]);

	async function refresh() {
		setLoading(true);
		setError(null);
		try {
			const data = await adminFetchJson('/api/admin/profiles', adminKey);
			setProfiles((data?.profiles ?? []) as GenerationProfile[]);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		if (!adminKey) return;
		void refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [adminKey]);

	function openCreate() {
		setEditorMode('create');
		setDraft(buildEmptyDraft());
		setEditorOpen(true);
	}

	function openEdit(p: GenerationProfile) {
		setEditorMode('edit');
		setDraft(draftFromProfile(p));
		setEditorOpen(true);
	}

	async function submit() {
		setError(null);

		const name = draft.name.trim();
		const topicPreference = draft.topic_preference.trim();
		if (!name) return setError('name 不能为空');
		if (!topicPreference) return setError('topic_preference 不能为空');

		const concurrency = Number(draft.concurrency);
		const timeoutMs = Number(draft.timeout_ms);
		if (!Number.isFinite(concurrency) || concurrency <= 0 || !Number.isInteger(concurrency)) return setError('concurrency 必须是正整数');
		if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isInteger(timeoutMs)) return setError('timeout_ms 必须是正整数');

		const modelSettingParsed = parseJsonField('model_setting', draft.model_setting_json);
		if (!modelSettingParsed.ok) return setError(modelSettingParsed.message);

		const payload: Record<string, unknown> = {
			name,
			topic_preference: topicPreference,
			model_setting: modelSettingParsed.value,
			concurrency,
			timeout_ms: timeoutMs
		};

		setLoading(true);
		try {
			if (editorMode === 'create') {
				await adminFetchJson('/api/admin/profiles', adminKey, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else if (draft.id) {
				await adminFetchJson(`/api/admin/profiles/${encodeURIComponent(draft.id)}`, adminKey, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}
			setEditorOpen(false);
			await refresh();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	async function removeProfile(id: string) {
		setLoading(true);
		setError(null);
		try {
			await adminFetchJson(`/api/admin/profiles/${encodeURIComponent(id)}`, adminKey, { method: 'DELETE' });
			await refresh();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setLoading(false);
		}
	}

	function confirmDelete(p: GenerationProfile) {
		Modal.confirm({
			title: '确认删除？',
			content: `将删除 profile "${p.name}"。若该 profile 已被 tasks 引用，将删除失败。`,
			okText: '删除',
			okType: 'danger',
			cancelText: '取消',
			onOk: () => removeProfile(p.id)
		});
	}

	return (
		<Flex direction="column" gap="4">
			<Flex align="center" justify="between" wrap="wrap" gap="3">
				<Flex direction="column" gap="1">
					<Text size="2" weight="medium">
						Generation Profiles
					</Text>
					<Text size="1" color="gray">
						点击"生成"会对所有 profiles 都生成，生成完成后在"当日任务"里选择发布哪一套。
					</Text>
				</Flex>

				<Flex gap="2" align="center">
					<Button type="button" size="1" variant="soft" onClick={refresh} disabled={loading}>
						<ReloadIcon /> 刷新
					</Button>
					<Button type="button" size="1" color="orange" onClick={openCreate} disabled={loading}>
						<PlusIcon /> 新建
					</Button>
				</Flex>
			</Flex>

			{error ? (
				<Text size="2" color="red">
					{error}
				</Text>
			) : null}

			<Table.Root variant="surface">
				<Table.Header>
					<Table.Row>
						<Table.ColumnHeaderCell>名称</Table.ColumnHeaderCell>
						<Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
						<Table.ColumnHeaderCell>并发/超时</Table.ColumnHeaderCell>
						<Table.ColumnHeaderCell>操作</Table.ColumnHeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{rows.length === 0 ? (
						<Table.Row>
							<Table.Cell colSpan={4}>
								<Text size="2" color="gray">
									暂无 profiles。请先创建一个。
								</Text>
							</Table.Cell>
						</Table.Row>
					) : (
						rows.map((p) => (
							<Table.Row key={p.id}>
								<Table.RowHeaderCell>
									<Flex direction="column" gap="1">
										<Text size="2" weight="medium">
											{p.name}
										</Text>
										<Flex gap="1" wrap="wrap">
											{splitTopicTags(p.topic_preference).map((t) => (
												<Badge key={t} variant="soft" color="gray">
													{t}
												</Badge>
											))}
										</Flex>
									</Flex>
								</Table.RowHeaderCell>
								<Table.Cell>
									<Badge variant="soft">{summarizeModelSetting(p.model_setting)}</Badge>
								</Table.Cell>
								<Table.Cell>
									<Text size="1" color="gray">
										{p.concurrency} / {p.timeout_ms}ms
									</Text>
								</Table.Cell>
								<Table.Cell>
									<Flex gap="2" align="center" wrap="wrap">
										<Button type="button" size="1" variant="soft" onClick={() => openEdit(p)} disabled={loading}>
											<Pencil1Icon /> 编辑
										</Button>
										<Button type="button" size="1" variant="soft" color="red" onClick={() => confirmDelete(p)} disabled={loading}>
											<TrashIcon /> 删除
										</Button>
									</Flex>
								</Table.Cell>
							</Table.Row>
						))
					)}
				</Table.Body>
			</Table.Root>

			<Modal
				title={editorMode === 'create' ? '新建 Profile' : '编辑 Profile'}
				open={editorOpen}
				onCancel={() => setEditorOpen(false)}
				footer={null}
				width={760}
			>
				<p className="text-sm text-gray-500 mb-4">用于配置模型设置、主题偏好与超时等。</p>

				<Flex direction="column" gap="4">
					<Flex direction="column" gap="2">
						<Text size="2" weight="medium">
							name
						</Text>
						<TextField.Root value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
					</Flex>

					<Flex direction="column" gap="2">
						<Text size="2" weight="medium">
							topic_preference
						</Text>
						<TextArea
							value={draft.topic_preference}
							onChange={(e) => setDraft((d) => ({ ...d, topic_preference: e.target.value }))}
							style={{ minHeight: 70 }}
						/>
						<Flex gap="1" wrap="wrap">
							{splitTopicTags(draft.topic_preference).map((t) => (
								<Badge key={t} variant="soft" color="gray">
									{t}
								</Badge>
							))}
						</Flex>
					</Flex>

					<Flex gap="4" wrap="wrap">
						<Flex direction="column" gap="2" style={{ flex: 1, minWidth: 220 }}>
							<Text size="2" weight="medium">
								concurrency
							</Text>
							<TextField.Root
								type="number"
								value={draft.concurrency}
								onChange={(e) => setDraft((d) => ({ ...d, concurrency: e.target.value }))}
							/>
						</Flex>
						<Flex direction="column" gap="2" style={{ flex: 1, minWidth: 220 }}>
							<Text size="2" weight="medium">
								timeout_ms
							</Text>
							<TextField.Root
								type="number"
								value={draft.timeout_ms}
								onChange={(e) => setDraft((d) => ({ ...d, timeout_ms: e.target.value }))}
							/>
						</Flex>
					</Flex>

					<Flex direction="column" gap="2">
						<Text size="2" weight="medium">
							model_setting (JSON)
						</Text>
						<Input.TextArea
							value={draft.model_setting_json}
							onChange={(e) => setDraft((d) => ({ ...d, model_setting_json: e.target.value }))}
							style={{ minHeight: 180 }}
						/>
					</Flex>

					<Flex gap="3" justify="end" mt="2">
						<Button type="button" variant="soft" onClick={() => setEditorOpen(false)} disabled={loading}>
							取消
						</Button>
						<Button color="orange" onClick={() => void submit()} disabled={loading}>
							保存
						</Button>
					</Flex>
				</Flex>
			</Modal>
		</Flex>
	);
}
