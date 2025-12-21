# dancix

简要索引：AGENT.md 只保留大纲，细节在代码与注释中。

## AGENT 索引
- 目标与原则：`AGENT.md`
- 定时窗口与流程：`workers/cron/index.ts`
- 抓词与入库：`src/lib/words/dailyWords.ts`、`src/lib/shanbay.ts`
- 任务编排与队列：`src/lib/tasks/articleGeneration.ts`、`src/lib/tasks/generationQueue.ts`
- LLM 多阶段与结构化校验：`src/lib/llm/openaiCompatible.ts`、`src/lib/schemas/dailyNews.ts`
- Prompt 规范：`src/lib/prompts/dailyNews.ts`、`prompts/daily_news.md`
- SRS 规则：`src/lib/srs.ts`
- 鉴权边界：`src/lib/admin.ts`、`src/pages/api/admin/*`
- DB 结构：`db/schema.ts`
- 高亮与 DOM 稳定性：`src/components/ArticleTabs.tsx`
