import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import VisualTether from '../components/VisualTether';
import { interactionStore, setActiveWord, setLevel } from '../lib/store/interactionStore';

// Mock Component to simulate the Article Page Environment
const ArticleSimulation = ({ difficulty = 1 }: { difficulty: number }) => {

    // Simulate initial setup
    useEffect(() => {
        setLevel(difficulty);
    }, [difficulty]);

    // Simulate functionality normally found in HighlightManager/highlighterLogic and WordSidebar script
    useEffect(() => {
        // 1. Sidebar Hover Logic (Card -> Store)
        const cards = document.querySelectorAll('[data-word-card]');
        const handleCardEnter = (e: Event) => {
            const word = (e.currentTarget as HTMLElement).getAttribute('data-word-card');
            if (word) setActiveWord(word);
        };
        const handleCardLeave = () => setActiveWord(null);

        cards.forEach(c => {
            c.addEventListener('mouseenter', handleCardEnter);
            c.addEventListener('mouseleave', handleCardLeave);
        });

        // 2. Word Hover Logic (Text -> Store)
        const words = document.querySelectorAll('.target-word');
        const handleWordEnter = (e: Event) => {
            const word = (e.currentTarget as HTMLElement).getAttribute('data-word');
            // In real app, this event is dispatched by highlighterLogic and caught by HighlightManager
            // Here we simulate the direct result
            if (word) setActiveWord(word);
        };
        const handleWordLeave = () => setActiveWord(null);

        words.forEach(w => {
            w.addEventListener('mouseenter', handleWordEnter);
            w.addEventListener('mouseleave', handleWordLeave);
        });

        // 3. Store -> Sidebar Active State (UI Reaction)
        const unsub = interactionStore.subscribe(state => {
            const activeWord = state.activeWord;
            cards.forEach(card => {
                const word = card.getAttribute('data-word-card');
                if (activeWord && word === activeWord) {
                    card.classList.add('scale-105', 'bg-white', 'shadow-xl', 'border-transparent', 'ring-1', 'ring-stone-200');
                    card.classList.remove('border-stone-100');
                } else {
                    card.classList.remove('scale-105', 'bg-white', 'shadow-xl', 'border-transparent', 'ring-1', 'ring-stone-200');
                    card.classList.add('border-stone-100');
                }
            });
        });

        return () => {
            cards.forEach(c => {
                c.removeEventListener('mouseenter', handleCardEnter);
                c.removeEventListener('mouseleave', handleCardLeave);
            });
            words.forEach(w => {
                w.removeEventListener('mouseenter', handleWordEnter);
                w.removeEventListener('mouseleave', handleWordLeave);
            });
            unsub();
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#F9F9F8] p-8 font-serif text-[#2D2D2D]">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 relative">

                {/* Main Article Area */}
                <div className="space-y-8">
                    <h1 className="text-5xl font-bold font-display tracking-tight leading-tight">
                        The Renaissance of Analog
                    </h1>

                    {/* Level 1 Content */}
                    <div className="article-level" data-level="1" style={{ display: difficulty === 1 ? 'block' : 'none' }}>
                        <p className="drop-cap-p text-xl leading-loose text-justify mb-6">
                            In an era defined by digital convenience, the resurgence of <span className="target-word" data-word="ephemeral">ephemeral</span> trends is remarkable.
                            Vinyl records have captured the hearts of a new generation. This revival speaks to a deeper desire for connection in an increasingly <span className="target-word" data-word="ephemeral">ephemeral</span> world.
                        </p>
                        <p className="text-xl leading-loose text-justify mb-6">
                            <span className="target-word" data-word="audiophiles">Audiophiles</span> and casual listeners alike are rediscovering the warm, rich sound that follows.
                            Meanwhile, things once considered <span className="target-word" data-word="obsolete">obsolete</span> are finding new life.
                        </p>
                        <p className="text-xl leading-loose text-justify mb-6">
                            Another instance of <span className="target-word" data-word="ephemeral">ephemeral</span> beauty can be found in film photography.
                        </p>
                    </div>

                    {/* Level 2 Content (Hidden by default) */}
                    <div className="article-level" data-level="2" style={{ display: difficulty === 2 ? 'block' : 'none' }}>
                        <p className="drop-cap-p text-xl leading-loose text-justify mb-6">
                            (Level 2 Version) The <span className="target-word" data-word="ephemeral">ephemeral</span> nature of modern tech contrasts with the permanence of analog media.
                            True <span className="target-word" data-word="audiophiles">audiophiles</span> know the difference.
                        </p>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="relative hidden lg:block">
                    <div className="sticky top-8 space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 pb-2 mb-4 border-b-2 border-slate-900">
                            Margin Notes
                        </h2>

                        <div className="space-y-4">
                            {/* Card 1 */}
                            <div
                                className="group pb-4 border-b border-stone-100 px-4 py-3 rounded-lg transition-all duration-300 border-stone-100"
                                data-word-card="ephemeral"
                            >
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-serif text-lg font-bold text-slate-900">ephemeral</span>
                                    <span className="text-xs text-stone-400 font-mono">/əˈfem(ə)rəl/</span>
                                </div>
                                <div className="text-sm text-stone-600">
                                    <span className="text-xs font-bold uppercase text-stone-400 mr-1">adj.</span>
                                    Lasting for a very short time.
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div
                                className="group pb-4 border-b border-stone-100 px-4 py-3 rounded-lg transition-all duration-300 border-stone-100"
                                data-word-card="audiophiles"
                            >
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-serif text-lg font-bold text-slate-900">audiophiles</span>
                                    <span className="text-xs text-stone-400 font-mono">/ˈôdēōˌfīl/</span>
                                </div>
                                <div className="text-sm text-stone-600">
                                    <span className="text-xs font-bold uppercase text-stone-400 mr-1">n.</span>
                                    Hi-fi enthusiasts.
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div
                                className="group pb-4 border-b border-stone-100 px-4 py-3 rounded-lg transition-all duration-300 border-stone-100"
                                data-word-card="obsolete"
                            >
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-serif text-lg font-bold text-slate-900">obsolete</span>
                                    <span className="text-xs text-stone-400 font-mono">/ˌäbsəˈlēt/</span>
                                </div>
                                <div className="text-sm text-stone-600">
                                    <span className="text-xs font-bold uppercase text-stone-400 mr-1">adj.</span>
                                    No longer produced or used.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* The Component Under Test */}
                <VisualTether />
            </div>
        </div>
    );
};

const meta: Meta<typeof ArticleSimulation> = {
    title: 'Experiments/ArticleInteraction',
    component: ArticleSimulation,
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        difficulty: {
            control: { type: 'select', options: [1, 2] },
            description: 'Simulates changing article difficulty level',
        }
    }
};

export default meta;
type Story = StoryObj<typeof ArticleSimulation>;

export const Default: Story = {
    args: {
        difficulty: 1,
    },
};

export const MultiLevel: Story = {
    args: {
        difficulty: 2,
    }
};
