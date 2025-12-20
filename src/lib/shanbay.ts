const BASE = 'https://apiv3.shanbay.com';

async function fetchJson(url: string, cookie: string) {
	const resp = await fetch(url, {
		method: 'GET',
		headers: {
			accept: 'application/json',
			'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
			'user-agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
			cookie
		}
	});
	if (!resp.ok) {
		const text = await resp.text().catch(() => '');
		throw new Error(`Shanbay HTTP ${resp.status} ${resp.statusText}: ${url}\n${text}`);
	}
	return resp.json() as Promise<unknown>;
}

class Func {
	static loop(cnt: number, func: (idx: number) => void) {
		for (let i = 0; i < cnt; i++) func(i);
	}
}

class Num {
	static get(num: number) {
		return num >>> 0;
	}
	static xor(a: number, b: number) {
		return this.get(this.get(a) ^ this.get(b));
	}
	static and(a: number, b: number) {
		return this.get(this.get(a) & this.get(b));
	}
	static mul(a: number, b: number) {
		const high16 = ((a & 0xffff0000) >>> 0) * b;
		const low16 = (a & 0x0000ffff) * b;
		return this.get((high16 >>> 0) + (low16 >>> 0));
	}
	static shiftLeft(a: number, b: number) {
		return this.get(this.get(a) << b);
	}
	static shiftRight(a: number, b: number) {
		return this.get(a) >>> b;
	}
}

const MIN_LOOP = 8;
const PRE_LOOP = 8;

const BAY_SH0 = 1;
const BAY_SH1 = 10;
const BAY_SH8 = 8;
const BAY_MASK = 0x7fffffff;

class Random {
	status: number[] = [];
	mat1 = 0;
	mat2 = 0;
	tmat = 0;

	seed(seeds: string) {
		Func.loop(4, (idx) => {
			this.status[idx] =
				seeds.length > idx ? Num.get(seeds.charAt(idx).charCodeAt(0)) : Num.get(110);
		});
		this.mat1 = this.status[1];
		this.mat2 = this.status[2];
		this.tmat = this.status[3];
		this.init();
	}

	private init() {
		Func.loop(MIN_LOOP - 1, (idx) => {
			this.status[(idx + 1) & 3] = Num.xor(
				this.status[(idx + 1) & 3],
				idx +
					1 +
					Num.mul(
						1812433253,
						Num.xor(this.status[idx & 3], Num.shiftRight(this.status[idx & 3], 30))
					)
			);
		});

		if (
			(this.status[0] & BAY_MASK) === 0 &&
			this.status[1] === 0 &&
			this.status[2] === 0 &&
			this.status[3] === 0
		) {
			this.status[0] = 66;
			this.status[1] = 65;
			this.status[2] = 89;
			this.status[3] = 83;
		}

		Func.loop(PRE_LOOP, () => this.nextState());
	}

	private nextState() {
		let y = this.status[3];
		let x = Num.xor(Num.and(this.status[0], BAY_MASK), Num.xor(this.status[1], this.status[2]));
		x = Num.xor(x, Num.shiftLeft(x, BAY_SH0));
		y = Num.xor(y, Num.xor(Num.shiftRight(y, BAY_SH0), x));

		this.status[0] = this.status[1];
		this.status[1] = this.status[2];
		this.status[2] = Num.xor(x, Num.shiftLeft(y, BAY_SH1));
		this.status[3] = y;

		this.status[1] = Num.xor(this.status[1], Num.and(-Num.and(y, 1), this.mat1));
		this.status[2] = Num.xor(this.status[2], Num.and(-Num.and(y, 1), this.mat2));
	}

	generate(max: number) {
		this.nextState();

		let t0 = this.status[3];
		const t1 = Num.xor(this.status[0], Num.shiftRight(this.status[2], BAY_SH8));
		t0 = Num.xor(t0, t1);
		t0 = Num.xor(Num.and(-Num.and(t1, 1), this.tmat), t0);

		return t0 % max;
	}
}

class Node {
	char = '.';
	children: Record<string, Node> = {};

	getChar() {
		return this.char;
	}
	setChar(v: string) {
		this.char = v;
	}
	getChildren() {
		return this.children;
	}
	setChildren(k: string, v: Node) {
		this.children[k] = v;
	}
}

const B32_CODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const B64_CODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CNT = [1, 2, 2, 2, 2, 2];

class Tree {
	random = new Random();
	sign = '';
	inter: Record<string, string> = {};
	head = new Node();

	init(sign: string) {
		this.random.seed(sign);
		this.sign = sign;

		Func.loop(64, (i) => {
			this.addSymbol(B64_CODE[i], CNT[parseInt(String((i + 1) / 11), 10)]);
		});
		this.inter['='] = '=';
	}

	private addSymbol(char: string, len: number) {
		let ptr = this.head;
		let symbol = '';

		Func.loop(len, () => {
			let innerChar = B32_CODE[this.random.generate(32)];
			while (innerChar in ptr.getChildren() && ptr.getChildren()[innerChar].getChar() !== '.') {
				innerChar = B32_CODE[this.random.generate(32)];
			}

			symbol += innerChar;
			if (!(innerChar in ptr.getChildren())) {
				ptr.setChildren(innerChar, new Node());
			}
			ptr = ptr.getChildren()[innerChar];
		});

		ptr.setChar(char);
		this.inter[char] = symbol;
		return symbol;
	}

	decode(enc: string) {
		let dec = '';
		for (let i = 4; i < enc.length; ) {
			if (enc[i] === '=') {
				dec += '=';
				i++;
				continue;
			}
			let ptr = this.head;
			while (enc[i] in ptr.getChildren()) {
				ptr = ptr.getChildren()[enc[i]];
				i++;
			}
			dec += ptr.getChar();
		}
		return dec;
	}
}

const getIdx = (c: string) => {
	const x = c.charCodeAt(0);
	if (x >= 65) return x - 65;
	return x - 65 + 41;
};

const VERSION = 1;

const checkVersion = (s: string) => {
	const wi = getIdx(s[0]) * 32 + getIdx(s[1]);
	const x = getIdx(s[2]);
	const check = getIdx(s[3]);
	return VERSION >= (wi * x + check) % 32;
};

const base64ToBytes = (b64: string) => {
	if (typeof atob === 'function') {
		return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
	}
	// nodejs_compat fallback
	return Uint8Array.from(Buffer.from(b64, 'base64'));
};

function decodeShanbayData(enc: string) {
	if (!checkVersion(enc)) return null;
	const tree = new Tree();
	tree.init(enc.slice(0, 4));
	const rawBase64 = tree.decode(enc);
	const jsonText = new TextDecoder('utf-8').decode(base64ToBytes(rawBase64));
	return JSON.parse(jsonText) as unknown;
}

async function getMaterialbookId(cookie: string) {
	const json = (await fetchJson(`${BASE}/wordsapp/user_material_books/current`, cookie)) as {
		materialbook_id?: string | number;
		materialbook?: { id?: string | number } | null;
	};

	const id = json.materialbook_id ?? json.materialbook?.id;
	if (typeof id !== 'string' && typeof id !== 'number') throw new Error('Shanbay: missing materialbook_id');
	return String(id);
}

async function getWordsInPage(cookie: string, page: number, materialbookId: string, typeOf: 'NEW' | 'REVIEW') {
	const url = `${BASE}/wordsapp/user_material_books/${materialbookId}/learning/words/today_learning_items?ipp=10&page=${page}&type_of=${typeOf}`;
	const json = (await fetchJson(url, cookie)) as { data?: string | null };
	if (!json || !json.data) return null;
	return decodeShanbayData(json.data);
}

async function getWordsAll(cookie: string, materialbookId: string, typeOf: 'NEW' | 'REVIEW') {
	const out: unknown[] = [];
	for (let page = 1; ; page++) {
		const decoded = await getWordsInPage(cookie, page, materialbookId, typeOf);
		const objects = (decoded as any)?.objects;
		if (!Array.isArray(objects) || objects.length === 0) break;
		out.push(...objects);
	}
	return out;
}

function toWordList(items: unknown[]) {
	return items
		.map((x: any) => x?.vocab_with_senses?.word)
		.filter((w: unknown) => typeof w === 'string' && w.length > 0) as string[];
}

export type ShanbayTodayWords = {
	materialbookId: string;
	newWords: string[];
	reviewWords: string[];
};

export async function fetchShanbayTodayWords(cookie: string): Promise<ShanbayTodayWords> {
	const materialbookId = await getMaterialbookId(cookie);
	const [newItems, reviewItems] = await Promise.all([
		getWordsAll(cookie, materialbookId, 'NEW'),
		getWordsAll(cookie, materialbookId, 'REVIEW')
	]);

	return {
		materialbookId,
		newWords: toWordList(newItems),
		reviewWords: toWordList(reviewItems)
	};
}
