/**
 * SettingsPanel - 设置面板主入口
 * 
 * 管理 Modal 状态并分发不同 Tab 的渲染
 * 子组件已拆分到 settings/ 目录
 */
import { useState, useEffect } from 'react';
import { GearIcon } from '@radix-ui/react-icons';
import { clsx } from 'clsx';
import { apiFetch } from '../lib/api';
import Modal from './ui/Modal';
import GeneralTab from './settings/GeneralTab';
import ReadingTab from './settings/ReadingTab';
import AudioTab from './settings/AudioTab';
import { useSettings } from './settings/useSettings';
// import type { Voice } from '../../server/src/services/edgeTtsService'; // Create a type definition or infer

interface VoiceOption {
	id: string;
	name: string;
	locale: string;
}

export default function SettingsPanel() {
	const [open, setOpen] = useState(false);
	const [voices, setVoices] = useState<VoiceOption[]>([]);
	const [loadingVoices, setLoadingVoices] = useState(false);

	const {
		adminKey,
		setAdminKey,
		savedAt,
		isAdmin,
		voice,
		setVoiceSettings,
		tab,
		setTab,
		hasKey,
		save,
		clearKey,
		llmProvider,
		setLlmProvider,
		availableLLMs
	} = useSettings();

	// Fetch voices on mount
	useEffect(() => {
		if (open) {
			setLoadingVoices(true);
			apiFetch('/api/tts/voices')
				.then((data: any) => {
					// Map to internal format
					const mapped: VoiceOption[] = data.map((v: any) => ({
						id: v.ShortName,
						name: `${v.FriendlyName} (${v.Gender})`.replace('Microsoft ', '').replace(' Online (Natural)', ''),
						locale: v.Locale
					}));
					setVoices(mapped);

					// Set default if current voice is invalid
					if (!voice || !mapped.find(v => v.id === voice)) {
						const defaultVoice = mapped.find(v => v.locale === 'en-US');
						if (defaultVoice) {
							setVoiceSettings(defaultVoice.id);
						}
					}
				})
				.catch(err => console.error('Failed to fetch voices', err))
				.finally(() => setLoadingVoices(false));
		}
	}, [open]); // Only fetch when opened to save bandwidth

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className="flex items-center gap-2 px-3 py-1.5 border border-transparent hover:border-stone-300 hover:bg-stone-100 transition-all rounded-sm group text-stone-500 hover:text-stone-900"
			>
				<span className="text-xs font-bold uppercase tracking-widest hidden md:inline-block">Settings</span>
				<GearIcon className="w-4 h-4" />
			</button>

			<Modal
				title={
					<div className="flex items-center gap-3">
						<span>Configuration</span>
						<span className={clsx(
							"px-2 py-0.5 text-[10px] uppercase tracking-wider font-sans border rounded-full font-bold",
							isAdmin ? "bg-green-50 text-green-700 border-green-200" :
								hasKey ? "bg-amber-50 text-amber-700 border-amber-200" :
									"bg-stone-100 text-stone-500 border-stone-200"
						)}>
							{isAdmin ? 'Admin' : hasKey ? 'Key Found' : 'No Access'}
						</span>
					</div>
				}
				open={open}
				onClose={() => setOpen(false)}
				width={800}
				minHeight={700}
			>
				{/* Tab Navigation */}
				<div className="flex border-b border-stone-200 mb-6 flex-wrap gap-y-2">
					<TabButton
						active={tab === 'general'}
						onClick={() => setTab('general')}
					>
						General
					</TabButton>
					{isAdmin && (
						<TabButton
							active={tab === 'reading'}
							onClick={() => setTab('reading')}
						>
							Reading
						</TabButton>
					)}
					<TabButton
						active={tab === 'audio'}
						onClick={() => setTab('audio')}
					>
						Audio
					</TabButton>
				</div>

				{/* Tab Content */}
				{tab === 'general' && (
					<GeneralTab
						adminKey={adminKey}
						setAdminKey={setAdminKey}
						hasKey={hasKey}
						clearKey={clearKey}
						savedAt={savedAt}
						save={save}
						llmProvider={llmProvider}
						setLlmProvider={setLlmProvider}
						availableLLMs={availableLLMs}
						isAdmin={isAdmin}
					/>
				)}
				{isAdmin && tab === 'reading' && <ReadingTab />}
				{tab === 'audio' && (
					<AudioTab
						voices={voices}
						voice={voice}
						setVoiceSettings={setVoiceSettings}
						savedAt={savedAt}
						save={save}
						loading={loadingVoices}
					/>
				)}
			</Modal>
		</>
	);
}

/**
 * TabButton - 标签页按钮
 */
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			onClick={onClick}
			className={clsx(
				"px-4 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors",
				active ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
			)}
		>
			{children}
		</button>
	);
}
