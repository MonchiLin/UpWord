/**
 * [每日单词索引器 (wordIndexer.ts)]
 * ------------------------------------------------------------------
 * 功能：构建倒排索引 (Inverted Index)，连接 [用户词汇库] 与 [生成文章]。
 *
 * 业务逻辑：
 * - 上下文优选：在 Level 1-3 中，优先选择篇幅最长 (Context Richness) 的文章提取例句。
 * - 滑动窗口：提取关键词前后 80 字符作为 `context_snippet`，用于前端 Popover 即时展示 (无需查原表)。
 *
 * 归一化规则：
 * - 忽略大小写与标点 (Sanitization)，确保 "Apple" 与 "apple." 命中同一索引。
 */

import type { AppKysely } from '../db/factory';

// ════════════════════════════════════════════════════════════════
// 类型定义
// ════════════════════════════════════════════════════════════════

interface InputWords {
    selected?: string[];
    new?: string[];
    review?: string[];
}

interface ArticleContent {
    content: string;
    word_count?: number;
}

interface ContentJson {
    input_words?: InputWords;
    result?: {
        articles?: ArticleContent[];
    };
}

/** 数据库插入行（匹配 DB 的 snake_case 命名） */
interface WordIndexInsertRow {
    id: string;
    word: string;
    article_id: string;
    context_snippet: string;
    role: 'keyword' | 'entity';
    created_at: string;
}

// ════════════════════════════════════════════════════════════════
// 辅助函数
// ════════════════════════════════════════════════════════════════

/**
 * 词汇归一化 (Normalization)
 *
 * 规则：Lowercase + 去除非字母数字。
 * 目的：解决 "Apple", "apple.", "APPLE" 被视为不同单词的问题，确保查全率。
 */
function sanitizeWord(w: string) {
    return w.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** 按句子拆分文本（用于提取上下文） */
function splitIntoSentences(text: string): string[] {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
}

// ════════════════════════════════════════════════════════════════
// 主函数
// ════════════════════════════════════════════════════════════════

/**
 * 为文章建立词汇索引
 *
 * @param articleId - 文章 ID
 * @param contentJson - 生成结果 JSON（包含目标词和文章内容）
 *
 * 执行流程：
 * 1. 收集所有目标词
 * 2. 选择字数最多的文章作为上下文来源（通常是 Level 3）
 * 3. 对每个目标词查找包含它的句子
 * 4. 批量插入索引记录
 */
export async function indexArticleWords(db: AppKysely, articleId: string, contentJson: ContentJson) {
    if (!contentJson || !contentJson.result || !contentJson.result.articles) {
        console.warn(`[WordIndexer] Invalid content JSON for article ${articleId}`);
        return;
    }

    // 收集所有目标词
    const inputWords = contentJson.input_words || {};
    const targets = new Set<string>();

    if (Array.isArray(inputWords.selected)) inputWords.selected.forEach((w: string) => targets.add(w));
    if (Array.isArray(inputWords.new)) inputWords.new.forEach((w: string) => targets.add(w));
    if (Array.isArray(inputWords.review)) inputWords.review.forEach((w: string) => targets.add(w));

    if (targets.size === 0) {
        console.log(`[WordIndexer] No target words to index for ${articleId}`);
        return;
    }

    console.log(`[WordIndexer] Indexing ${targets.size} words for article ${articleId}`);

    // [Article Selection Strategy]
    // 意图：为单词匹配最佳语境 (Best Context)。
    // 启发：Level 3 通常词汇密度最高、句式最复杂，最适合作为"例句来源"。
    // 兜底：若 Level 3 生成失败，回退到字数最多的可用版本 (`b.word_count - a.word_count`)。
    const articles = contentJson.result.articles as ArticleContent[];
    const mainArticle = articles.sort((a, b) => (b.word_count || 0) - (a.word_count || 0))[0];

    if (!mainArticle || !mainArticle.content) {
        console.warn(`[WordIndexer] No valid content found in any level for ${articleId}`);
        return;
    }

    const sentences = splitIntoSentences(mainArticle.content);
    const entriesToInsert: WordIndexInsertRow[] = [];

    // 为每个目标词查找上下文
    for (const rawWord of targets) {
        const word = sanitizeWord(rawWord);
        if (word.length < 2) continue;  // 跳过过短的词

        const regex = new RegExp(`\\b${word}\\b`, 'i');
        const matchedSentence = sentences.find(s => regex.test(s));

        if (matchedSentence) {
            // [Snippet Extraction: Sliding Window]
            //意图：截取目标词前后的 text window，存入 DB 以供前端 Popover 直接展示。
            // 策略：Window Size = 160 chars (前后各 80)。
            // 细节：若截断位置在句子中间，添加 "..." 省略号提示用户。
            let snippet = matchedSentence.trim();
            if (snippet.length > 200) {
                const matchIndex = snippet.toLowerCase().indexOf(word);
                const start = Math.max(0, matchIndex - 80);
                const end = Math.min(snippet.length, matchIndex + 80);
                snippet = (start > 0 ? '...' : '') + snippet.substring(start, end) + (end < snippet.length ? '...' : '');
            }

            entriesToInsert.push({
                id: crypto.randomUUID(),
                word: word,
                article_id: articleId,
                context_snippet: snippet,
                role: 'keyword',
                created_at: new Date().toISOString()
            });
        }
    }

    // 批量插入索引
    if (entriesToInsert.length > 0) {
        try {
            await db.insertInto('article_word_index')
                .values(entriesToInsert)
                .onConflict((oc) => oc.doNothing())  // 避免重复索引
                .execute();
            console.log(`[WordIndexer] Successfully indexed ${entriesToInsert.length} words.`);
        } catch (e) {
            console.error(`[WordIndexer] Failed to insert index:`, e);
        }
    }
}

