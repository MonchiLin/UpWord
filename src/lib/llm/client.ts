import OpenAI from 'openai';

export type OpenAiCompatibleEnv = {
    LLM_API_KEY: string;
    LLM_BASE_URL: string;
};

export function createOpenAiCompatibleClient(
    env: OpenAiCompatibleEnv,
    options?: { dangerouslyAllowBrowser?: boolean }
) {
    // LLM_BASE_URL 必须包含 /v1，代码不会自动补齐。
    if (!env.LLM_API_KEY) throw new Error('Missing LLM_API_KEY');
    if (!env.LLM_BASE_URL) throw new Error('Missing LLM_BASE_URL');
    return new OpenAI({
        apiKey: env.LLM_API_KEY,
        baseURL: env.LLM_BASE_URL,
        ...(options?.dangerouslyAllowBrowser ? { dangerouslyAllowBrowser: true } : null)
    });
}
