import { unauthorized } from './http';

export const ADMIN_SESSION_COOKIE = 'luma-words_admin';

function getCookieValue(request: Request, name: string): string | null {
	const header = request.headers.get('cookie');
	if (!header) return null;

	const parts = header.split(';');
	for (const part of parts) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		const eq = trimmed.indexOf('=');
		if (eq < 0) continue;
		const k = trimmed.slice(0, eq).trim();
		if (k !== name) continue;
		const v = trimmed.slice(eq + 1);
		try {
			return decodeURIComponent(v);
		} catch {
			return v;
		}
	}

	return null;
}

export function isAdminRequest(request: Request, locals: App.Locals) {
	const expected = locals.runtime.env.ADMIN_KEY;
	if (!expected) return false;

	const headerKey = request.headers.get('x-admin-key');
	if (headerKey && headerKey === expected) return true;

	const auth = request.headers.get('authorization');
	if (auth) {
		const m = auth.match(/^Bearer\s+(.+)$/i);
		if (m?.[1] && m[1] === expected) return true;
	}

	const cookieKey = getCookieValue(request, ADMIN_SESSION_COOKIE);
	return typeof cookieKey === 'string' && cookieKey === expected;
}

export function requireAdmin(request: Request, locals: App.Locals) {
	if (!isAdminRequest(request, locals)) return unauthorized();
	return null;
}
