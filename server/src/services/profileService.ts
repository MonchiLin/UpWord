
import { db } from '../db/factory';
import { AppError } from '../errors/AppError';
import { toCamelCase } from '../utils/casing';

export interface ProfileBody {
    name: string;
    topicIds?: string[];
}

export class ProfileService {
    /**
     * Get all profiles with their associated topics
     */
    static async getAllProfiles() {
        const profiles = await db.selectFrom('generation_profiles')
            .selectAll()
            .orderBy('updated_at', 'desc')
            .execute();

        // Enrich with topics
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

            // Sync Topics
            if (body.topicIds) {
                // Transaction-like: Delete all, then insert
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
    static async deleteProfile(id: string) {
        return await db.transaction().execute(async (tx) => {
            // Cascade delete tasks and their children
            // 1. Get Tasks
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
