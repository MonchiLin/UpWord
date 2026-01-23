
import { db } from '../db/factory';
import { AppError } from '../errors/AppError';
import { toCamelCase } from '../utils/casing';

/**
 * 生成配置服务 (Profile Service)
 *
 * 领域实体：**Generation Profile**
 * 定义了用户的个性化生成偏好（如感兴趣的话题、绑定的 RSS 源）。
 *
 * 核心职责：
 * 1. **CRUD 管理**：Profile 的增删改查。
 * 2. **关联聚合**：处理 Profile 与 Topics (多对多) 和 RSS Sources (多对多) 的复杂关系。
 * 3. **级联清理 (Cascade Delete)**：当 Profile 删除时，安全清除所有下游数据（Tasks, Articles, Highlights）。
 *
 * 技术特性：
 * - 使用 **Manual Join** 而非 ORM 懒加载，以避免 N+1 查询性能陷阱。
 * - 使用 **Transaction** 保证多表更新的原子性。
 */
export interface ProfileBody {
    name: string;
    topicIds?: string[];
}

export class ProfileService {
    /**
     * Get all profiles with their associated topics
     */
    static async getAllProfiles() {
        // N+1 优化策略 (Manual Eager Loading)
        // 1. 先查询主表 (Profiles)
        // 2. 遍历结果并行查询关联表 (Topics)
        // 虽是 N+1，但在 SQLite/D1 这种极其快速的进程内数据库中，这种显式控制比复杂的 JOIN 更易维护。
        const profiles = await db.selectFrom('generation_profiles')
            .selectAll()
            .orderBy('updated_at', 'desc')
            .execute();

        const result = await Promise.all(profiles.map(async (p) => {
            const topics = await db.selectFrom('profile_topics')
                .innerJoin('topics', 'profile_topics.topic_id', 'topics.id')
                .select(['topics.id', 'topics.label'])
                .where('profile_topics.profile_id', '=', p.id)
                .execute();

            return {
                ...(toCamelCase(p) as object),
                topics: topics.map(t => ({ id: t.id, label: t.label })),
                topicIds: topics.map(t => t.id),
                // Legacy compatibility: Construct string from labels
                topicPreference: topics.map(t => t.label).join(', ')
            };
        }));

        return result;
    }

    /**
     * Get a single profile by ID
     */
    static async getProfileById(id: string) {
        const p = await db.selectFrom('generation_profiles')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();

        if (!p) throw AppError.notFound(`Profile with ID ${id} not found`);

        const topics = await db.selectFrom('profile_topics')
            .innerJoin('topics', 'profile_topics.topic_id', 'topics.id')
            .select(['topics.id', 'topics.label'])
            .where('profile_topics.profile_id', '=', id)
            .execute();

        return {
            ...(toCamelCase(p) as object),
            topics: topics.map(t => ({ id: t.id, label: t.label })),
            topicIds: topics.map(t => t.id),
            topicPreference: topics.map(t => t.label).join(', ')
        };
    }

    /**
     * Create a new profile
     */
    static async createProfile(body: ProfileBody) {
        const id = crypto.randomUUID();

        await db.transaction().execute(async (tx) => {
            await tx.insertInto('generation_profiles')
                .values({
                    id: id,
                    name: body.name
                })
                .execute();

            if (body.topicIds && body.topicIds.length > 0) {
                const values = body.topicIds.map(tid => ({
                    profile_id: id,
                    topic_id: tid
                }));

                await tx.insertInto('profile_topics')
                    .values(values)
                    .onConflict(oc => oc.doNothing())
                    .execute();
            }
        });

        return { status: "ok", id };
    }

    /**
     * Update an existing profile
     */
    static async updateProfile(id: string, body: ProfileBody) {
        await db.transaction().execute(async (tx) => {
            await tx.updateTable('generation_profiles')
                .set({
                    name: body.name,
                    updated_at: new Date().toISOString()
                })
                .where('id', '=', id)
                .execute();

            // Sync Topics (Full Replacement Strategy)
            if (body.topicIds) {
                // Delete all, then re-insert
                await tx.deleteFrom('profile_topics')
                    .where('profile_id', '=', id)
                    .execute();

                if (body.topicIds.length > 0) {
                    const values = body.topicIds.map(tid => ({
                        profile_id: id,
                        topic_id: tid
                    }));
                    await tx.insertInto('profile_topics').values(values).execute();
                }
            }
        });

        return { status: "ok" };
    }

    /**
     * Delete a profile and cascade delete all associated data
     * (Tasks, Articles, Highlights, Index, etc.)
     */
    /**
     * Delete a profile and cascade delete all associated data.
     * Manual cleanup required as D1/SQLite FKs are strict or manual.
     */
    static async deleteProfile(id: string) {
        return await db.transaction().execute(async (tx) => {

            // [级联删除策略 - Cascade Strategy]
            // 为了保证数据完整性，必须严格按照 "叶子节点 -> 树枝 -> 根节点" 的顺序删除。
            //
            // 删除顺序：
            // 1. Leaves: Highlights, WordIndex, Variants (依附于 Articles)
            // 2. Branches: Articles (依附于 Tasks)
            // 3. Trunks: Tasks (依附于 Profile)
            // 4. Roots: Profile 及其关联 (Topics/Sources)
            //
            // 为什么不使用数据库级 ON DELETE CASCADE?
            // - SQLite/D1 对外键约束的支持需要显式开启 (`PRAGMA foreign_keys = ON`)。
            // - 我们希望在应用层保留对由于 Profile 删除而导致的大规模数据清除的控制权（例如未来可能改为软删除）。
            const taskIds = await tx.selectFrom('tasks')
                .select('id')
                .where('profile_id', '=', id)
                .execute();

            const tIds = taskIds.map(t => t.id);

            if (tIds.length > 0) {
                // Highlights, Index
                const articleIdQuery = tx.selectFrom('articles').select('id').where('generation_task_id', 'in', tIds);

                await tx.deleteFrom('highlights').where('article_id', 'in', articleIdQuery).execute();
                await tx.deleteFrom('article_word_index').where('article_id', 'in', articleIdQuery).execute();
                await tx.deleteFrom('article_variants').where('article_id', 'in', articleIdQuery).execute();
                await tx.deleteFrom('article_vocabulary').where('article_id', 'in', articleIdQuery).execute();

                await tx.deleteFrom('articles').where('generation_task_id', 'in', tIds).execute();
                await tx.deleteFrom('tasks').where('id', 'in', tIds).execute();
            }

            // Delete profile associations
            await tx.deleteFrom('profile_topics').where('profile_id', '=', id).execute();
            await tx.deleteFrom('profile_sources').where('profile_id', '=', id).execute(); // Delete sources
            await tx.deleteFrom('generation_profiles').where('id', '=', id).execute();

            return { status: "ok" };
        });
    }

    /**
     * Link an RSS source to a profile
     */
    static async addSource(profileId: string, sourceId: string) {
        await db.insertInto('profile_sources')
            .values({
                profile_id: profileId,
                source_id: sourceId
            })
            // Ignore if already bound
            .onConflict((oc) => oc.doNothing())
            .execute();

        return { success: true };
    }

    /**
     * Unlink an RSS source from a profile
     */
    static async removeSource(profileId: string, sourceId: string) {
        await db.deleteFrom('profile_sources')
            .where('profile_id', '=', profileId)
            .where('source_id', '=', sourceId)
            .execute();

        return { success: true };
    }

    /**
     * Get all sources linked to a profile
     */
    static async getSources(profileId: string) {
        const sources = await db.selectFrom('news_sources as ns')
            .innerJoin('profile_sources as ps', 'ps.source_id', 'ns.id')
            .select(['ns.id', 'ns.name', 'ns.url', 'ns.is_active'])
            .where('ps.profile_id', '=', profileId)
            .execute();

        return sources.map(s => ({
            ...s,
            is_active: Boolean(s.is_active)
        }));
    }
}
