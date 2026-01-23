/**
 * [UpWord Backend Entrypoint (server/index.ts)]
 * ------------------------------------------------------------------
 * 功能：初始化 Elysia 应用实例，组装全局中间件、路由控制器与后台守护进程。
 *
 * 核心架构:
 * - Bootstrapper: 负责 DB 连接、Worker 启动 (Queue Consumer) 和 Cron 调度器 (Producer) 的生命周期管理。
 * - Gatekeeper: 实现 "Global-First" 鉴权策略 —— 默认拦截 /api/admin 和 /api/tasks，保障系统安全。
 * - Dependency Injection: 将 `queue` 实例手动注入各个 Route Controller，避免模块间循环依赖。
 */

import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { db } from './src/db/factory';
import { TaskQueue } from './src/services/tasks/queue';
import { AppError, formatErrorResponse } from './src/errors/AppError';

// Routes
import { healthRoutes } from './routes/health';
import { tasksRoutes } from './routes/tasks';
import { wordsRoutes } from './routes/words';
import { contentRoutes } from './routes/content';
import { articlesRoutes } from './routes/articles';
import { authRoutes, getAdminKey } from './routes/auth';
import { profilesRoutes } from './routes/profiles';
import { highlightsRoutes } from './routes/highlights';
import { adminRoutes } from './routes/admin';
import { cronRoutes } from './routes/cron';
import { echoesRoutes } from './routes/echoes';
import { ttsRoutes } from './routes/tts';
import { configRoutes } from './routes/config';
import { setupRoutes } from './routes/setup';
import { topicsRoutes } from './routes/topics';
import { rssRoutes } from './routes/rss';
import { impressionRoutes } from './routes/impression';
import { env } from './config/env';

// 后台工作进程 (Background Workers)
import { startTaskWorker } from './workers/taskWorker';
import { startCronScheduler } from './workers/cronScheduler';

console.log("Using D1 (Strict). Skipping runtime migration (Managed via Wrangler/Drizzle Kit).");

// 依赖注入: 将数据库实例注入任务队列
const queue = new TaskQueue(db);

startTaskWorker(queue);

// 环境限制: 仅在生产环境启动 Cron，防止开发环境热重载导致定时任务重复触发
if (process.env.NODE_ENV === 'production') {
    startCronScheduler(queue);
}

// Error Handling Configuration

/** Elysia 内置错误码到 HTTP 状态码映射 */
const errorCodeToStatus: Record<string, number> = {
    'NOT_FOUND': 404,
    'VALIDATION': 400,
    'PARSE': 400,
    'UNKNOWN': 500,
    'INTERNAL_SERVER_ERROR': 500
};

// Application Assembly

const app = new Elysia()
    // 跨域配置：允许所有来源 + Cookie
    .use(cors({
        origin: true,
        credentials: true
    }))

    // 全局错误处理器: 统一将所有异常转换为标准 JSON 响应
    .onError(({ code, error, set }) => {
        // 自定义 AppError 处理
        if (error instanceof AppError) {
            set.status = error.statusCode;
            if (error.statusCode >= 500) {
                console.error(`[AppError] Code: ${error.code}`, error);
            }
            return formatErrorResponse(error);
        }

        // Elysia 内置错误处理
        const status = (typeof code === 'string' ? errorCodeToStatus[code] : undefined) || 500;
        set.status = status;

        if (status >= 500) {
            console.error(`[ServerError] Code: ${code}`, error);
        }

        return formatErrorResponse(error, String(code));
    })

    // Swagger API 文档
    .use(swagger({
        documentation: {
            info: {
                title: 'UpWord API',
                version: '1.0.0',
                description: 'UpWord 每日单词学习平台 API'
            }
        }
    }))

    // 公开路由（无需认证）
    .use(healthRoutes)
    .use(authRoutes)

    /**
     * [Global Gatekeeper Middlemare]
     * 策略：白名单机制 (Whitelist Strategy)。
     * 逻辑：
     * 1. 拦截所有敏感路径 (`/admin`, `/tasks` 等)。
     * 2. 验证凭证：优先检查 `x-admin-key` Header，其次检查 `admin_key` Cookie (适配浏览器直连)。
     * 3. 拒绝：抛出 401 Unauthorized。
     */
    .onBeforeHandle(({ request }) => {
        const path = new URL(request.url).pathname;
        const isProtected = path.startsWith('/api/admin') ||
            path.startsWith('/api/tasks') ||
            path.startsWith('/api/generate') ||
            path.startsWith('/api/profiles') ||
            path.startsWith('/api/words') ||
            path.startsWith('/api/cron') ||
            path.startsWith('/api/topics') || // [Protect Topics]
            path.startsWith('/api/impression') || // [Protect Impression]
            (path.startsWith('/api/articles') && (request.method === 'DELETE' || request.method === 'PATCH'));

        if (!isProtected) return;

        // 支持 Header (x-admin-key) 和 Cookie (admin_key) 两种方式
        const key = getAdminKey(request);
        if (key !== env.ADMIN_KEY) {
            throw AppError.unauthorized('Admin key required');
        }
    })

    // 业务路由
    .use(tasksRoutes(queue))
    .use(wordsRoutes)
    .use(contentRoutes)
    .use(articlesRoutes)
    .use(profilesRoutes)
    .use(highlightsRoutes)
    .use(adminRoutes(queue))
    .use(cronRoutes(queue))
    .use(echoesRoutes)
    .use(ttsRoutes)
    .use(configRoutes)
    .use(setupRoutes)
    .use(topicsRoutes)
    .use(rssRoutes)
    .use(impressionRoutes(queue))
    .listen(Number(process.env.PORT) || 3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
