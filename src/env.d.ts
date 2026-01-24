/// <reference types="@cloudflare/workers-types" />

import type { Runtime } from '@astrojs/cloudflare';

type UpWordsEnv = {
	ADMIN_KEY: string;
	SITE_URL: string;
	PUBLIC_API_BASE: string;
};

declare global {
	namespace App {
		interface Locals extends Runtime<LumaWordsEnv> {
			auth: import('./types/auth').AdminState;
		}
	}
}

export { };
