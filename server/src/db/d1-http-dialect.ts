/**
 * Kysely D1 HTTP Dialect
 * 
 * 通过 Cloudflare REST API 访问 D1 数据库，适用于非 Workers 环境（如 Docker）。
 * 
 * @see https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/
 */

import {
    CompiledQuery,
    Kysely,
    SqliteAdapter,
    SqliteIntrospector,
    SqliteQueryCompiler,
} from 'kysely';
import type {
    DatabaseConnection,
    DatabaseIntrospector,
    Dialect,
    DialectAdapter,
    Driver,
    QueryCompiler,
    QueryResult,
    TransactionSettings,
} from 'kysely';

export interface D1HttpConfig {
    accountId: string;
    databaseId: string;
    apiToken: string;
}

interface D1ApiResponse {
    success: boolean;
    errors: Array<{ code: number; message: string }>;
    messages: string[];
    result: Array<{
        success: boolean;
        results: Record<string, unknown>[];
        meta: {
            served_by: string;
            duration: number;
            changes: number;
            last_row_id: number;
            changed_db: boolean;
            size_after: number;
            rows_read: number;
            rows_written: number;
        };
    }>;
}

class D1HttpConnection implements DatabaseConnection {
    readonly #config: D1HttpConfig;

    constructor(config: D1HttpConfig) {
        this.#config = config;
    }

    async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
        const { accountId, databaseId, apiToken } = this.#config;
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sql: compiledQuery.sql,
                params: compiledQuery.parameters,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`D1 HTTP API error (${response.status}): ${text}`);
        }

        const data = await response.json() as D1ApiResponse;

        if (!data.success) {
            const errorMessages = data.errors.map(e => e.message).join(', ');
            throw new Error(`D1 query failed: ${errorMessages}`);
        }

        // D1 API 返回结果数组，取第一个结果
        const result = data.result[0];

        if (!result || !result.success) {
            throw new Error('D1 query returned no result');
        }

        return {
            rows: result.results as R[],
            numAffectedRows: result.meta?.changes != null
                ? BigInt(result.meta.changes)
                : undefined,
            insertId: result.meta?.last_row_id != null
                ? BigInt(result.meta.last_row_id)
                : undefined,
        };
    }

    // D1 HTTP API 不支持流式查询
    async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
        throw new Error('D1 HTTP dialect does not support streaming');
    }
}

class D1HttpDriver implements Driver {
    readonly #config: D1HttpConfig;

    constructor(config: D1HttpConfig) {
        this.#config = config;
    }

    async init(): Promise<void> {
        // 无需初始化
    }

    async acquireConnection(): Promise<DatabaseConnection> {
        return new D1HttpConnection(this.#config);
    }

    async beginTransaction(
        _connection: DatabaseConnection,
        _settings: TransactionSettings
    ): Promise<void> {
        // D1 HTTP API 不支持显式事务控制
        // 每个 HTTP 请求都是独立的，无法跨请求维护事务状态
        // 这里静默忽略，依赖 D1 的单语句原子性
    }

    async commitTransaction(_connection: DatabaseConnection): Promise<void> {
        // 静默忽略 - D1 HTTP 不支持显式事务
    }

    async rollbackTransaction(_connection: DatabaseConnection): Promise<void> {
        // 静默忽略 - D1 HTTP 不支持显式事务
    }

    async releaseConnection(): Promise<void> {
        // HTTP 连接无需释放
    }

    async destroy(): Promise<void> {
        // 无需销毁
    }
}

export class D1HttpDialect implements Dialect {
    readonly #config: D1HttpConfig;

    constructor(config: D1HttpConfig) {
        this.#config = config;
    }

    createDriver(): Driver {
        return new D1HttpDriver(this.#config);
    }

    createQueryCompiler(): QueryCompiler {
        return new SqliteQueryCompiler();
    }

    createAdapter(): DialectAdapter {
        return new SqliteAdapter();
    }

    createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
        return new SqliteIntrospector(db);
    }
}
