import { clsx } from 'clsx';
import type { ProfileDraft, Topic } from './types';

interface ProfileConfigurationTabProps {
    draft: ProfileDraft;
    setDraft: React.Dispatch<React.SetStateAction<ProfileDraft>>;
    loading: boolean;
    availableTopics: Topic[];
    onCreateTopic: () => void;
    onToggleTopic: (id: string) => void;
}

export default function ProfileConfigurationTab({
    draft,
    setDraft,
    loading,
    availableTopics,
    onCreateTopic,
    onToggleTopic
}: ProfileConfigurationTabProps) {
    return (
        <div className="space-y-6 pt-4">
            <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">Profile Name</label>
                <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:border-stone-500 text-stone-900 text-sm focus:outline-none transition-colors"
                    placeholder="e.g. Morning Digest"
                    disabled={loading}
                />
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center bg-stone-50 p-2 border border-stone-100 rounded-sm">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-stone-600">Topics</h4>
                        <p className="text-[10px] text-stone-400">Select topics to include.</p>
                    </div>
                    <button
                        onClick={onCreateTopic}
                        className="text-[10px] uppercase font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1 bg-white px-2 py-1 border border-stone-200 shadow-sm rounded-sm hover:border-stone-300 transition-all"
                    >
                        <span className="text-lg leading-none">+</span> New Topic
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                    {availableTopics.length === 0 ? (
                        <div className="col-span-full text-stone-400 text-sm italic p-2 text-center">No active topics found.</div>
                    ) : (
                        availableTopics.map(topic => {
                            const isSelected = draft.topicIds.includes(topic.id);
                            return (
                                <button
                                    key={topic.id}
                                    onClick={() => onToggleTopic(topic.id)}
                                    className={clsx(
                                        "px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition-all border rounded-sm flex items-center justify-between group",
                                        isSelected
                                            ? "bg-stone-800 text-white border-stone-800 shadow-md transform scale-[1.02]"
                                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700 hover:bg-stone-50"
                                    )}
                                >
                                    <span className="truncate">{topic.label}</span>
                                    {isSelected && <span className="text-stone-400">✓</span>}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
