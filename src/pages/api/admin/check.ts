import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/admin';
import { json } from '../../../lib/http';

export const GET: APIRoute = async ({ request, locals }) => {
	const denied = requireAdmin(request, locals);
	if (denied) return denied;
	return json({ ok: true });
};

