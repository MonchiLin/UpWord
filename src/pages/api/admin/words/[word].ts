import type { APIRoute } from 'astro';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { words } from '../../../../../db/schema';
import { requireAdmin } from '../../../../lib/admin';
import { getDb } from '../../../../lib/db';
import { badRequest, json } from '../../../../lib/http';

const bodySchema = z.object({
    masteryStatus: z.enum(['unknown', 'familiar', 'mastered'])
});

export const PATCH: APIRoute = async ({ request, locals, params }) => {
    const denied = requireAdmin(request, locals);
    if (denied) return denied;

    const word = params.word;
    if (!word) return badRequest('Missing word parameter');

    try {
        const body = await request.json();
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return badRequest('Invalid request body', parsed.error.flatten());

        const db = getDb(locals);
        const now = new Date().toISOString();

        const result = await db
            .update(words)
            .set({
                masteryStatus: parsed.data.masteryStatus,
                updatedAt: now
            })
            .where(eq(words.word, word))
            .returning({ word: words.word });

        if (result.length === 0) {
            return json({ ok: false, error: 'word_not_found' }, { status: 404 });
        }

        return json({ ok: true, word, masteryStatus: parsed.data.masteryStatus });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return json({ ok: false, error: 'internal_error', message }, { status: 500 });
    }
};
