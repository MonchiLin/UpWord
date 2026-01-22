import { clsx } from 'clsx';
import type { Topic } from './types';
import RssSourceManager from '../RssSourceManager';

interface TopicSourceAccordionProps {
    topic: Topic;
    isExpanded: boolean;
    onToggle: () => void;
}

export default function TopicSourceAccordion({ topic, isExpanded, onToggle }: TopicSourceAccordionProps) {
    return (
        <div className="border border-stone-200 rounded-sm overflow-hidden bg-white">
            <button
                onClick={onToggle}
                className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-wider transition-colors",
                    isExpanded ? "bg-stone-100 text-stone-900" : "bg-white text-stone-600 hover:bg-stone-50"
                )}
            >
                <span>{topic.label}</span>
                <span className="text-[10px] flex items-center gap-1">
                    {isExpanded ? 'Close' : 'Manage Sources'}
                    <span className={clsx("transition-transform duration-200", isExpanded ? "rotate-180" : "")}>▼</span>
                </span>
            </button>

            {isExpanded && (
                <div className="p-3 bg-stone-50 border-t border-stone-200 animate-in slide-in-from-top-2 duration-200">
                    <RssSourceManager targetId={topic.id} targetType="topics" />
                </div>
            )}
        </div>
    );
}
