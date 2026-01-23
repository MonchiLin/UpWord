/**
 * Gemini Provider E2E Test
 * 
 * Simulates real task creation flow using today's date.
 * Run: bun test tests/llm/gemini.test.ts
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { createClient, type LLMClientConfig } from '../../src/services/llm/client';
import { runPipeline, type PipelineCheckpoint } from '../../src/services/llm/pipeline';
import { saveTestPipelineResult } from './saveResult';

// Get today's date in YYYY-MM-DD format
const TODAY = new Date().toISOString().split('T')[0]!;

// Gemini Configuration from env
const config: LLMClientConfig = {
    provider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    baseUrl: process.env.GEMINI_BASE_URL,
    model: process.env.GEMINI_MODEL || '',
};

// Test data - simulating real candidate words
const TEST_CANDIDATE_WORDS = [
    'algorithm', 'neural', 'quantum', 'interface', 'latency',
    'optimize', 'infrastructure', 'resilience', 'paradigm', 'scalable'
];

const TEST_TOPIC_PREFERENCE = 'Technology & AI';

describe('Gemini Provider - Full Pipeline Test', () => {
    beforeAll(() => {
        if (!config.apiKey || !config.model) {
            console.warn('[Skip] GEMINI_API_KEY or GEMINI_MODEL not set');
        }
        console.log(`[Gemini Test] Date: ${TODAY}, Model: ${config.model}`);
    });

    it('should complete full 4-stage pipeline', async () => {
        if (!config.apiKey || !config.model) {
            console.log('[Skip] No Gemini credentials');
            return;
        }

        const client = createClient(config);
        const checkpoints: PipelineCheckpoint[] = [];

        const result = await runPipeline({
            client,
            currentDate: TODAY,
            topicPreference: TEST_TOPIC_PREFERENCE,
            candidateWords: TEST_CANDIDATE_WORDS,
            recentTitles: [],
            onCheckpoint: async (cp) => {
                checkpoints.push(cp);
                console.log(`[Gemini] Checkpoint: ${cp.stage}`);
            }
        });

        // Verify output structure
        expect(result.output).toBeDefined();
        expect(result.output.title).toBeTruthy();
        expect(result.output.articles).toBeDefined();
        expect(result.output.articles.length).toBeGreaterThan(0);
        expect(result.output.articles.length).toBeGreaterThan(0);
        expect(result.selectedWords.length).toBeGreaterThan(0);

        // [New] Verify pull_quote and summary for L2/L3
        const complexArticles = result.output.articles.filter(a => a.level > 1);
        if (complexArticles.length > 0) {
            // Note: Schema defines these as optional but for L2/L3 we strongly expect them
            const sample = complexArticles[0]!;
            if (sample.summary) expect(sample.summary.length).toBeGreaterThan(10);
            if (sample.pull_quote) expect(sample.pull_quote.length).toBeGreaterThan(5);
            console.log(`[Gemini] Checked L${sample.level} article extras:`, {
                hasSummary: !!sample.summary,
                hasQuote: !!sample.pull_quote
            });
        }

        // Verify checkpoints were saved
        expect(checkpoints.length).toBeGreaterThan(0);

        console.log('[Gemini] Generated:', result.output.title);
        console.log('[Gemini] Selected words:', result.selectedWords);
        console.log('[Gemini] Article levels:', result.output.articles.length);

        // Save to Database
        await saveTestPipelineResult(result, config);
    }, 35 * 60 * 1000); // 35 minute timeout for full pipeline

    it('should support basic generation', async () => {
        if (!config.apiKey || !config.model) {
            console.log('[Skip] No Gemini credentials');
            return;
        }

        const client = createClient(config);

        const response = await client.generate({
            prompt: 'Say "Hello from Gemini!" and nothing else.',
        });

        expect(response.text).toBeTruthy();
        expect(response.text.toLowerCase()).toContain('hello');
        console.log('[Gemini] Basic response:', response.text);
    }, 60000);
});
