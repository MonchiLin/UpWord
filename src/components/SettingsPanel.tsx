import { GearIcon } from '@radix-ui/react-icons';
import { Badge, Button, Flex, Tabs, Text, TextField } from '@radix-ui/themes';
import { Modal } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ProfilesPanel from './ProfilesPanel';

const ADMIN_KEY_STORAGE = 'luma-words_admin_key';

async function checkAdminSession() {
	const resp = await fetch('/api/admin/check', { credentials: 'same-origin' });
	return resp.ok;
}

async function loginAdmin(adminKey: string) {
	const resp = await fetch('/api/admin/session', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ key: adminKey })
	});
	return resp.ok;
}

async function logoutAdmin() {
	await fetch('/api/admin/session', { method: 'DELETE', credentials: 'same-origin' });
}

export default function SettingsPanel() {
	const [open, setOpen] = useState(false);
	const [adminKey, setAdminKey] = useState('');
	const [savedAt, setSavedAt] = useState<number | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [tab, setTab] = useState<'general' | 'profiles'>('general');

	const hasKey = useMemo(() => adminKey.trim().length > 0, [adminKey]);

	useEffect(() => {
		let canceled = false;
		try {
			const storedKey = localStorage.getItem(ADMIN_KEY_STORAGE) ?? '';
			setAdminKey(storedKey);
		} catch {
			// 忽略
		}

		(async () => {
			try {
				const hasSession = await checkAdminSession();
				if (canceled) return;
				if (hasSession) {
					setIsAdmin(true);
					return;
				}
				const key = (() => {
					try {
						return (localStorage.getItem(ADMIN_KEY_STORAGE) ?? '').trim();
					} catch {
						return '';
					}
				})();
				if (!key) {
					setIsAdmin(false);
					return;
				}
				const ok = await loginAdmin(key);
				if (!canceled) setIsAdmin(ok);
			} catch {
				if (!canceled) setIsAdmin(false);
			}
		})();

		return () => {
			canceled = true;
		};
	}, []);

	useEffect(() => {
		if (!isAdmin && tab === 'profiles') setTab('general');
	}, [isAdmin, tab]);

	function save() {
		const nextKey = adminKey.trim();
		try {
			if (nextKey) localStorage.setItem(ADMIN_KEY_STORAGE, nextKey);
			else localStorage.removeItem(ADMIN_KEY_STORAGE);
			setSavedAt(Date.now());
		} catch {
			// 忽略
		}

		if (nextKey) {
			void loginAdmin(nextKey)
				.then(setIsAdmin)
				.catch(() => setIsAdmin(false));
		} else {
			void logoutAdmin()
				.then(() => setIsAdmin(false))
				.catch(() => setIsAdmin(false));
		}
	}

	function clearKey() {
		setAdminKey('');
		setIsAdmin(false);
		try {
			localStorage.removeItem(ADMIN_KEY_STORAGE);
		} catch {
			// 忽略
		}
		void logoutAdmin().catch(() => undefined);
	}

	return (
		<>
			<Button variant="ghost" size="2" onClick={() => setOpen(true)}>
				<GearIcon /> 设置
			</Button>
			<Modal
				title={
					<Flex align="center" justify="between" gap="3">
						<span>设置</span>
						<Badge color={isAdmin ? 'green' : hasKey ? 'amber' : 'gray'}>{isAdmin ? 'Admin' : hasKey ? 'Key 已保存' : '未配置'}</Badge>
					</Flex>
				}
				open={open}
				onCancel={() => setOpen(false)}
				footer={null}
				width={860}
			>
				<Tabs.Root value={tab} onValueChange={(v) => setTab(v === 'profiles' ? 'profiles' : 'general')}>
					<Tabs.List color="orange" mt="4" wrap="wrap">
						<Tabs.Trigger value="general">基础</Tabs.Trigger>
						{isAdmin ? <Tabs.Trigger value="profiles">Profiles</Tabs.Trigger> : null}
					</Tabs.List>

					<Tabs.Content value="general">
						<Flex direction="column" gap="5" mt="5">
							<Flex direction="column" gap="2">
								<Text size="2" weight="medium">
									Admin Key
								</Text>
								<TextField.Root
									placeholder="输入管理员 Key（仅本机保存）"
									value={adminKey}
									onChange={(e) => setAdminKey(e.target.value)}
								/>
								<Flex align="center" justify="between">
									<Text size="1" color="gray">
										状态：{hasKey ? '已配置' : '未配置'}
									</Text>
									<Button type="button" variant="ghost" size="1" onClick={clearKey} disabled={!hasKey}>
										清除
									</Button>
								</Flex>
							</Flex>

							{savedAt ? (
								<Text size="1" color="gray">
									已保存：{new Date(savedAt).toLocaleString()}
								</Text>
							) : null}

							<Flex gap="3" justify="end">
								<Button variant="soft" onClick={() => setOpen(false)}>
									关闭
								</Button>
								<Button color="orange" onClick={save}>
									保存
								</Button>
							</Flex>
						</Flex>
					</Tabs.Content>

					{isAdmin ? (
						<Tabs.Content value="profiles">
							<Flex direction="column" gap="5" mt="5">
								<ProfilesPanel adminKey={adminKey.trim()} />
								<Flex justify="end">
									<Button variant="soft" onClick={() => setOpen(false)}>
										关闭
									</Button>
								</Flex>
							</Flex>
						</Tabs.Content>
					) : null}
				</Tabs.Root>
			</Modal>
		</>
	);
}
