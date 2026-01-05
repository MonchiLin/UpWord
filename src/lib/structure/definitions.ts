/**
 * Centralized Definitions for Sentence Structure Grammar Roles.
 * Shared between Backend (Injection), Frontend (Positioning), and UI (HelpPanel).
 * 
 * NOTE TO AI AGENTS:
 * This file is the single source of truth for the linguistic analysis system ("Sentence Component Analysis").
 * It controls:
 * 1. Visual Rendering (Color, Label Text)
 * 2. DOM Nesting Logic (via 'priority')
 * 3. Interactive Behavior (via 'noLabel')
 */

export type StructureRole =
    | 's' | 'v' | 'o' | 'io' | 'cmp' // Core
    | 'rc' | 'pp' | 'adv' | 'app'    // Clauses & Phrases
    | 'pas' | 'con'                  // Voice & Connectives
    | 'inf' | 'ger' | 'ptc';         // Non-finite

/**
 * Definition of a Grammar Role.
 * 
 * @property id       - Unique identifier (e.g., 's', 'v').
 * @property label    - Short abbreviation used in floating labels (e.g., 'S').
 * @property name     - Full human-readable name, bilingual (e.g., '主语 (Subject)').
 * @property desc     - Educational description shown in the Help/Legend panel.
 * @property example  - Example sentence for the legend.
 * @property target   - The specific part of the example sentence that highlights this role.
 * @property color    - Hex code for the label background and text highlight.
 * 
 * @property priority - NESTING CONTROL (Critical):
 *                      - Lower number = *Higher* Priority = *Outer* Wrapper.
 *                      - Elements with priority 1 will wrap elements with priority 10.
 *                      - Example: 'rc' (0) wraps 's' (1). 'pas' (1) wraps 'v' (2).
 *                      - Conflict Resolution: If ranges are identical, the Lower Priority Number wraps the Higher Priority Number.
 * 
 * @property noLabel  - RENDERING CONTROL:
 *                      - If true, the `labelPositioner` system will NOT generate a floating tag for this role.
 *                      - The text will still be accessible in the DOM and may be colored/underlined,
 *                        but visual clutter constitutes by floating labels will be suppressed.
 *                      - Useful for Connectives or particles where only color is needed.
 */
export interface GrammarRoleDef {
    id: StructureRole;
    label: string;
    name: string;
    desc: string;
    example: string;
    target: string;
    color: string;
    priority: number;
    noLabel?: boolean;
}

export const GRAMMAR_ROLES: Record<StructureRole, GrammarRoleDef> = {
    // --- 核心成分 (Core) ---
    's': {
        id: 's', label: 'S', name: '主语 (Subject)',
        desc: '执行动作的人或物。',
        example: 'The fox jumps.', target: 'The fox',
        color: '#1e3a8a',
        priority: 1
    },
    'v': {
        id: 'v', label: 'V', name: '谓语 (Verb)',
        desc: '完整的谓语动词短语（含助动词）。',
        example: 'She can do it.', target: 'can do',
        color: '#991b1b',
        priority: 2
    },
    'o': {
        id: 'o', label: 'O', name: '直接宾语 (Direct Object)',
        desc: '动作的承受者。',
        example: 'He eats an apple.', target: 'an apple',
        color: '#065f46',
        priority: 3
    },
    'io': {
        id: 'io', label: 'IO', name: '间接宾语 (Indirect Object)',
        desc: '动作的接受者。',
        example: 'She gave him a book.', target: 'him',
        color: '#047857',
        priority: 4
    },
    'cmp': {
        id: 'cmp', label: 'CMP', name: '补语 (Complement)',
        desc: '补充说明主语或宾语的成分。',
        example: 'She seems happy.', target: 'happy',
        color: '#7c3aed',
        priority: 5
    },

    // --- 从句与短语 (Clauses & Phrases) ---
    // Scope (RC, PP) usually wraps Core, so they should generally have lower priority index (processed earlier/outer)?
    // The previous array was: ['rc', 's', 'v', 'o', 'io', 'cmp', 'pp', 'adv', 'app', 'pas', 'con', 'inf', 'ger', 'ptc']
    // Let's mimic that order.
    'rc': {
        id: 'rc', label: 'RC', name: '定语从句 (Relative Clause)',
        desc: '用来修饰名词的从句。',
        example: 'The man who lives here.', target: 'who lives here',
        color: '#475569',
        priority: 0 // TOP priority (Outer wrapper)
    },
    'pp': {
        id: 'pp', label: 'PP', name: '介词短语 (Prepositional Phrase)',
        desc: '以介词开头的修饰短语。',
        example: 'In the morning, he runs.', target: 'In the morning',
        color: '#64748b',
        priority: 6
    },
    'adv': {
        id: 'adv', label: 'ADV', name: '状语 (Adverbial)',
        desc: '修饰动词、形容词或整个句子。',
        example: 'He ran quickly.', target: 'quickly',
        color: '#0369a1',
        priority: 7
    },
    'app': {
        id: 'app', label: 'APP', name: '同位语 (Appositive)',
        desc: '紧跟名词的解释性成分。',
        example: 'My friend, John, is here.', target: 'John',
        color: '#0891b2',
        priority: 8
    },

    // --- 语态与连接 (Voice & Connectives) ---
    'pas': {
        id: 'pas', label: 'PAS', name: '被动语态 (Passive Voice)',
        desc: '主语是动作的承受者。',
        example: 'The cake was eaten.', target: 'was eaten',
        color: '#c2410c',
        priority: 1
    },
    'con': {
        id: 'con', label: 'CON', name: '连接词 (Connective)',
        desc: '连接句子或观点的词。',
        example: 'However, it rained.', target: 'However',
        color: '#92400e',
        priority: 10,
        noLabel: true
    },

    // --- 非谓语动词 (Non-finite) ---
    'inf': {
        id: 'inf', label: 'INF', name: '不定式 (Infinitive)',
        desc: 'to + 动词原形，作名词、形容词或副词用。',
        example: 'I want to learn.', target: 'to learn',
        color: '#be185d',
        priority: 11
    },
    'ger': {
        id: 'ger', label: 'GER', name: '动名词 (Gerund)',
        desc: '动词-ing形式作名词用。',
        example: 'Swimming is fun.', target: 'Swimming',
        color: '#9d174d',
        priority: 12
    },
    'ptc': {
        id: 'ptc', label: 'PTC', name: '分词 (Participle)',
        desc: '现在分词或过去分词作修饰语。',
        example: 'The running water flows.', target: 'running',
        color: '#831843',
        priority: 13
    }
};

// Helper List for iteration (preserves defining order)
export const ROLE_LIST = Object.values(GRAMMAR_ROLES);
