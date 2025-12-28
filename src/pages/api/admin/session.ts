import type { APIRoute } from 'astro';
import { ADMIN_SESSION_COOKIE } from '../../../lib/admin';
import { badRequest, json, unauthorized } from '../../../lib/http';

function cookieAttrs(options: { secure: boolean; maxAgeSeconds: number }) {
	const attrs = [
		`Path=/`,
		`HttpOnly`,
		`SameSite=Strict`,
		`Max-Age=${options.maxAgeSeconds}`
	];
	if (options.secure) attrs.push('Secure');
	return attrs.join('; ');
}

function setCookie(name: string, value: string, options: { secure: boolean; maxAgeSeconds: number }) {
	return `${name}=${encodeURIComponent(value)}; ${cookieAttrs(options)}`;
}

export const POST: APIRoute = async ({ request, locals, url }) => {
	const expected = process.env.ADMIN_KEY;
	if (!expected) return unauthorized();

	let key: string | null = request.headers.get('x-admin-key');
	if (!key) {
		try {
			const body = (await request.json().catch(() => null)) as any;
			key = typeof body?.key === 'string' ? body.key : null;
		} catch {
			key = null;
		}
	}

	if (!key) return badRequest('Missing admin key.');
	if (key !== expected) return unauthorized();

	const secure = url.protocol === 'https:';

	return json(
		{ ok: true },
		{
			headers: {
				'set-cookie': setCookie(ADMIN_SESSION_COOKIE, expected, { secure, maxAgeSeconds: 60 * 60 * 24 * 30 })
			}
		}
	);
};

export const DELETE: APIRoute = async ({ url }) => {
	const secure = url.protocol === 'https:';
	return json(
		{ ok: true },
		{
			headers: {
				'set-cookie': setCookie(ADMIN_SESSION_COOKIE, '', { secure, maxAgeSeconds: 0 })
			}
		}
	);
};
