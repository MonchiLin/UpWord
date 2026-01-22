import { useState } from 'react';
import { Drawer, ConfigProvider, Tabs } from 'antd';
import { useProfileDrawerLogic } from './profile/useProfileDrawerLogic';
import ProfileConfigurationTab from './profile/ProfileConfigurationTab';
import ProfileDataSourcesTab from './profile/ProfileDataSourcesTab';
import type { ProfileDraft } from './profile/types';

interface ProfileDrawerProps {
    open: boolean;
    mode: 'create' | 'edit';
    initialDraft: ProfileDraft;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProfileDrawer({ open, mode, initialDraft, onClose, onSuccess }: ProfileDrawerProps) {
    const {
        draft,
        setDraft,
        loading,
        error,
        availableTopics,
        handleCreateTopic,
        toggleTopic,
        handleSubmit
    } = useProfileDrawerLogic({ open, mode, initialDraft, onSuccess });

    const [activeTab, setActiveTab] = useState('1');

    const items = [
        {
            key: '1',
            label: 'Configuration',
            children: (
                <ProfileConfigurationTab
                    draft={draft}
                    setDraft={setDraft}
                    loading={loading}
                    availableTopics={availableTopics}
                    onCreateTopic={handleCreateTopic}
                    onToggleTopic={toggleTopic}
                />
            )
        },
        {
            key: '2',
            label: 'Data Sources (RSS)',
            disabled: !draft.id,
            children: (
                <ProfileDataSourcesTab
                    draft={draft}
                    availableTopics={availableTopics}
                />
            )
        }
    ];

    return (
        <ConfigProvider
            theme={{
                token: {
                    fontFamily: 'inherit',
                    colorPrimary: '#1c1917', // stone-900
                    borderRadius: 2,
                },
                components: {
                    Tabs: {
                        itemColor: '#78716c', // stone-500
                        itemSelectedColor: '#1c1917', // stone-900
                        itemHoverColor: '#44403c', // stone-700
                        titleFontSize: 13,
                        inkBarColor: '#1c1917', // stone-900
                        itemActiveColor: '#1c1917',
                    },
                    Drawer: {
                        colorBgElevated: '#ffffff',
                    }
                }
            }}
        >
            <Drawer
                title={
                    <div className="flex items-center gap-2 text-stone-800">
                        <span className="font-serif italic text-lg">{mode === 'create' ? 'Create Profile' : 'Edit Profile'}</span>
                        {mode === 'edit' && draft.name && <span className="text-xs font-sans font-normal px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">{draft.name}</span>}
                    </div>
                }
                placement="right"
                onClose={onClose}
                open={open}
                size="large"
                classNames={{
                    header: 'border-b border-stone-100 px-6 py-4',
                    body: 'p-0',
                    footer: 'border-t border-stone-100 p-4 bg-stone-50/50'
                }}
                closeIcon={<span className="text-stone-400 hover:text-stone-900 transition-colors text-lg">×</span>}
            >
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {error && (
                            <div className="mb-6 text-sm text-red-600 bg-red-50 p-4 border border-red-100 rounded-sm flex items-center gap-2">
                                <span className="text-red-400">⚠</span> {error}
                            </div>
                        )}

                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            items={items}
                            className="font-sans profile-drawer-tabs"
                            size="large"
                            tabBarStyle={{ marginBottom: 24, borderBottom: '1px solid #e7e5e4' }}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 p-4 bg-white/80 backdrop-blur border-t border-stone-100 flex justify-end gap-3 z-10">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-stone-500 text-xs font-bold uppercase tracking-widest hover:text-stone-900 hover:bg-stone-50 rounded-sm transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => void handleSubmit()}
                            disabled={loading}
                            className="px-6 py-2 bg-stone-900 text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-stone-800 disabled:opacity-50 shadow-sm transition-all transform active:scale-[0.98]"
                        >
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </div>
            </Drawer>
        </ConfigProvider>
    );
}
