/**
 * [数据库工厂]
 * ------------------------------------------------------------------
 * 功能描述: 根据环境变量动态构建 Kysely 数据库实例，屏蔽底层驱动差异。
 *
 * 核心职责:
 * - 多驱动适配 (Driver Adapter): 支持 Sqlite (Local), D1 (Cloudflare), MySQL/PG 等多种驱动。
 *
 * 注意事项: The 'sqlite-local' driver requires the Bun runtime.
 */
import { Kysely, ParseJSONResultsPlugin } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { D1HttpDialect } from './d1-http-dialect';
import type { Database } from './types';
import * as path from 'path';
import { createRequire } from 'module';

// Define the global type for Cloudflare Worker bindings
interface Env {
    DB: any;
}

export type AppKysely = Kysely<Database>;

// Bun-compatible require
const require = createRequire(import.meta.url);

export function createDatabase(env?: Env): AppKysely {
    const driver = process.env.DB_DRIVER || 'sqlite-local';
    const plugins = [new ParseJSONResultsPlugin()];

    // [1] sqlite-local: Bun Native SQLite (Optimized for Bun)
    if (driver === 'sqlite-local') {
        const dbPath = process.env.DB_CONNECTION || path.resolve(import.meta.dir, '../../local.db');
        console.log(`[DB] Kysely Provider: sqlite-local (${dbPath})`);

        try {
            const { BunSqliteDialect } = require('kysely-bun-sqlite');
            const { Database: BunDatabase } = require('bun:sqlite');

            return new Kysely<Database>({
                dialect: new BunSqliteDialect({
                    database: new BunDatabase(dbPath),
                }),
                plugins,
                log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
            });
        } catch (error) {
            // If running in Node/Astro Check, this might fail.
            // But we must NOT fallback to a dummy driver if the user wants strict Bun.
            // However, to keep CI/Check passing, we throw a clearer error OR crash if strict.
            // User requested "No Downgrade".
            console.error("[DB] Failed to load Bun SQLite. Ensure you are running with 'bun'.");
            throw error;
        }
    }

    // [2] d1-binding: Cloudflare Workers (Production)
    if (driver === 'd1-binding') {
        if (!env || !env.DB) {
            throw new Error("DB_DRIVER=d1-binding requires 'env.DB' to be passed to createDatabase(env)");
        }
        console.log(`[DB] Kysely Provider: d1-binding`);

        return new Kysely<Database>({
            dialect: new D1Dialect({ database: env.DB }),
            plugins,
        });
    }

    // [3] d1-http: Cloudflare HTTP API
    if (driver === 'd1-http') {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
        const apiKey = process.env.CLOUDFLARE_API_TOKEN;

        if (!accountId || !databaseId || !apiKey) {
            throw new Error("DB_DRIVER=d1-http requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, and CLOUDFLARE_API_TOKEN");
        }

        console.log(`[DB] Kysely Provider: d1-http (Account: ${accountId}, DB: ${databaseId})`);

        return new Kysely<Database>({
            dialect: new D1HttpDialect({
                accountId,
                databaseId,
                apiToken: apiKey,
            }),
            plugins,
        });
    }

    // [4] turso: LibSQL via HTTP/WebSocket
    if (driver === 'turso') {
        const url = process.env.DB_CONNECTION;
        const authToken = process.env.TURSO_AUTH_TOKEN;
        if (!url) throw new Error("DB_DRIVER=turso requires DB_CONNECTION to be set");

        console.log(`[DB] Kysely Provider: turso (${url})`);
        const { LibsqlDialect } = require('@libsql/kysely-libsql');

        return new Kysely<Database>({
            dialect: new LibsqlDialect({ url, authToken: authToken || undefined }),
            plugins,
        });
    }

    // [5] mysql
    if (driver === 'mysql') {
        const url = process.env.DB_CONNECTION;
        if (!url) throw new Error("DB_DRIVER=mysql requires DB_CONNECTION to be set");
        console.log(`[DB] Kysely Provider: mysql`);
        const { MysqlDialect } = require('kysely');
        const { createPool } = require('mysql2');

        return new Kysely<Database>({
            dialect: new MysqlDialect({ pool: createPool(url) }),
            plugins,
        });
    }

    // [6] postgres
    if (driver === 'postgres') {
        const url = process.env.DB_CONNECTION;
        if (!url) throw new Error("DB_DRIVER=postgres requires DB_CONNECTION to be set");
        console.log(`[DB] Kysely Provider: postgres`);
        const { PostgresDialect } = require('kysely');
        const { Pool } = require('pg');

        return new Kysely<Database>({
            dialect: new PostgresDialect({ pool: new Pool({ connectionString: url }) }),
            plugins,
        });
    }

    // [7] mssql
    if (driver === 'mssql') {
        const connectionString = process.env.DB_CONNECTION;
        if (!connectionString) throw new Error("DB_DRIVER=mssql requires DB_CONNECTION to be set");
        console.log(`[DB] Kysely Provider: mssql`);
        const { MssqlDialect } = require('kysely');
        const tedious = require('tedious');
        const tarn = require('tarn');
        const url = new URL(connectionString);
        const database = url.pathname.slice(1);

        return new Kysely<Database>({
            dialect: new MssqlDialect({
                tarn: { ...tarn, options: { min: 0, max: 10 } },
                tedious: {
                    ...tedious,
                    connectionFactory: () => new tedious.Connection({
                        authentication: {
                            type: 'default',
                            options: { userName: url.username, password: url.password }
                        },
                        server: url.hostname,
                        options: {
                            port: url.port ? parseInt(url.port) : 1433,
                            database: database,
                            trustServerCertificate: true,
                        }
                    })
                }
            }),
            plugins,
        });
    }

    throw new Error(`Unknown DB_DRIVER: ${driver}`);
}

export const db = createDatabase();
