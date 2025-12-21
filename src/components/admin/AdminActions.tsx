import { FileDown, Play } from 'lucide-react';

type AdminActionsProps = {
    loading: boolean;
    onFetchWords: () => void;
    onGenerate: () => void;
};

export default function AdminActions({ loading, onFetchWords, onGenerate }: AdminActionsProps) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <button
                onClick={onFetchWords}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-600 bg-white border border-stone-300 hover:border-stone-900 hover:text-stone-900 hover:bg-stone-50 transition-all disabled:opacity-50"
            >
                <FileDown size={14} />
                Fetch Words
            </button>
            <button
                onClick={onGenerate}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-600 bg-white border border-stone-300 hover:border-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-all disabled:opacity-50"
            >
                <Play size={14} className="text-orange-600 fill-orange-600" />
                Generate
            </button>
        </div>
    );
}
