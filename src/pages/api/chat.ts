import type { APIRoute } from 'astro';
import { createOpenAiCompatibleClient } from '../../lib/llm/openaiCompatible';

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const body = await request.json() as any;
		const messages = body.messages || [];

		// Robust environment variable access
		const runtimeEnv = (locals as any).runtime?.env || {};
		const apiKey = runtimeEnv.LLM_API_KEY || import.meta.env.LLM_API_KEY || process.env.LLM_API_KEY;
		const baseURL = runtimeEnv.LLM_BASE_URL || import.meta.env.LLM_BASE_URL || process.env.LLM_BASE_URL;
		const defaultModel = runtimeEnv.LLM_MODEL_DEFAULT || import.meta.env.LLM_MODEL_DEFAULT || process.env.LLM_MODEL_DEFAULT || 'gpt-4o-mini';

		if (!apiKey || !baseURL) {
			return new Response(JSON.stringify({ error: 'Missing LLM configuration' }), { status: 500 });
		}

		// Use the native OpenAI client helper
		const client = createOpenAiCompatibleClient({
			LLM_API_KEY: apiKey,
			LLM_BASE_URL: baseURL,
		});

		const response = await client.chat.completions.create({
			model: defaultModel,
			messages: messages.map((m: any) => ({
				role: m.role,
				content: m.content
			})),
			stream: true,
		});

		// Create a simple text stream (sending raw content chunks)
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				try {
					for await (const chunk of response) {
						const content = chunk.choices[0]?.delta?.content;
						if (content) {
							controller.enqueue(encoder.encode(content));
						}
					}
					controller.close();
				} catch (err) {
					controller.error(err);
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Transfer-Encoding': 'chunked',
			}
		});
	} catch (error) {
		console.error('Chat API Error:', error);
		return new Response(JSON.stringify({ error: 'Internal Server Error', details: String(error) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
