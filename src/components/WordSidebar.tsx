import { SoundOutlined } from '@ant-design/icons';
import { useStore } from '@nanostores/react';
import { highlightedWordId, setHighlightedWord } from '../lib/store/wordHighlight';

export type WordDefinition = {
    word: string;
    phonetic: string;
    definitions: { pos: string; definition: string }[];
};

export type WordInfo = WordDefinition & {
    masteryStatus: 'unknown' | 'familiar' | 'mastered';
};

function speak(text: string, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent triggering word selection
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function WordCard({ wordInfo }: { wordInfo: WordInfo }) {
    const activeId = useStore(highlightedWordId);
    const isActive = activeId?.toLowerCase() === wordInfo.word.toLowerCase();

    return (
        <div
            className={`rounded-xl border p-4 shadow-sm transition-all cursor-pointer hover:border-orange-500/50 hover:bg-orange-50/10 ${isActive
                    ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50'
                    : 'border-gray-200 bg-white'
                }`}
            onClick={() => setHighlightedWord(wordInfo.word)}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-orange-500">{wordInfo.word}</div>
                    {wordInfo.phonetic && (
                        <div className="text-xs text-gray-400 mt-0.5">{wordInfo.phonetic}</div>
                    )}
                    <div className="mt-2 space-y-1">
                        {wordInfo.definitions.map((def, i) => (
                            <div key={i} className="text-sm text-gray-600 line-clamp-2">
                                <span className="text-gray-400 mr-1">{def.pos}</span>
                                {def.definition}
                            </div>
                        ))}
                    </div>
                </div>
                <button
                    type="button"
                    className="w-8 h-8 flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shrink-0"
                    title="Pronounce"
                    onClick={(e) => speak(wordInfo.word, e)}
                >
                    <SoundOutlined className="text-gray-500 text-sm" />
                </button>
            </div>
        </div>
    );
}

export function WordSidebar({ words }: { words: WordInfo[] }) {
    if (!words || words.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">
                Words
            </div>
            <div className="grid grid-cols-2 gap-3">
                {words.map((w) => (
                    <WordCard key={w.word} wordInfo={w} />
                ))}
            </div>
        </div>
    );
}

export default WordSidebar;
