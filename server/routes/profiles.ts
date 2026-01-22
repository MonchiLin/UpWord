
import { Elysia, t } from 'elysia';
import { type ProfileBody, ProfileService } from '../src/services/profileService';

export const profilesRoutes = new Elysia({ prefix: '/api/profiles' })
    .get('/', async () => {
        return await ProfileService.getAllProfiles();
    })
    .get('/:id', async ({ params: { id } }) => {
        return await ProfileService.getProfileById(id);
    })
    .post('/', async ({ body }) => {
        return await ProfileService.createProfile(body as ProfileBody);
    })
    .put('/:id', async ({ params: { id }, body }) => {
        return await ProfileService.updateProfile(id, body as ProfileBody);
    })
    .delete('/:id', async ({ params: { id } }) => {
        return await ProfileService.deleteProfile(id);
    })

    // --- Profile Source Management Endpoints ---

    /**
     * POST /api/profiles/:id/sources
     * Bind RSS source to Profile
     */
    .post('/:id/sources', async ({ params: { id }, body }) => {
        const { sourceId } = body as { sourceId: string };
        return await ProfileService.addSource(id, sourceId);
    }, {
        body: t.Object({
            sourceId: t.String()
        })
    })

    /**
     * DELETE /api/profiles/:id/sources/:sourceId
     * Unbind RSS source from Profile
     */
    .delete('/:id/sources/:sourceId', async ({ params: { id, sourceId } }) => {
        return await ProfileService.removeSource(id, sourceId);
    })

    /**
     * GET /api/profiles/:id/sources
     * List bound sources
     */
    .get('/:id/sources', async ({ params: { id } }) => {
        return await ProfileService.getSources(id);
    });
