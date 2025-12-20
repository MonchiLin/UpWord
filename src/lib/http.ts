export function json(data: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			...(init?.headers ?? {})
		}
	});
}

export function badRequest(message: string, details?: unknown) {
	return json({ ok: false, error: 'bad_request', message, details }, { status: 400 });
}

export function unauthorized() {
	return json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

export function notFound() {
	return json({ ok: false, error: 'not_found' }, { status: 404 });
}

export function methodNotAllowed() {
	return json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
}

