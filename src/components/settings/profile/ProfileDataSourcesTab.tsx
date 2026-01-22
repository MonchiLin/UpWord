import { useState } from 'react';
import type { ProfileDraft, Topic } from './types';
import RssSourceManager from '../RssSourceManager';
import TopicSourceAccordion from './TopicSourceAccordion';

interface ProfileDataSourcesTabProps {
    draft: ProfileDraft;
    availableTopics: Topic[];
}

export default function ProfileDataSourcesTab({ draft, availableTopics }: ProfileDataSourcesTabProps) {
    const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

    return (
        <div className="space-y-8 pt-4">
            {!draft.id && <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100">Please save the profile first to configure sources.</div>}

            {/* 1. Profile Level */}
            {draft.id && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500 border-b border-stone-200 pb-2 flex items-center gap-2">
                        <span>Profile Direct Feeds</span>
                        <span className="px-1.5 py-0.5 bg-stone-100 text-[10px] rounded-full text-stone-400 font-normal">Global</span>
                    </h4>
                    <div className="bg-stone-50 border border-stone-200 rounded-sm p-3">
                        <RssSourceManager targetId={draft.id} targetType="profiles" />
                    </div>
                </div>
            )}

            {/* 2. Topic Level */}
            {draft.id && draft.topicIds.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500 border-b border-stone-200 pb-2 flex items-center gap-2">
                        <span>Topic Specific Feeds</span>
                        <span className="px-1.5 py-0.5 bg-stone-100 text-[10px] rounded-full text-stone-400 font-normal">Overrides</span>
                    </h4>

                    <div className="space-y-2">
                        {draft.topicIds.map(tid => {
                            const topic = availableTopics.find(t => t.id === tid);
                            if (!topic) return null;

                            return (
                                <TopicSourceAccordion
                                    key={tid}
                                    topic={topic}
                                    isExpanded={expandedTopicId === tid}
                                    onToggle={() => setExpandedTopicId(expandedTopicId === tid ? null : tid)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
