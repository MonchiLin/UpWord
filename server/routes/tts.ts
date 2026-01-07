import { Elysia, t } from 'elysia';
import { EdgeTTS } from 'edge-tts-universal';

export const ttsRoutes = new Elysia({ prefix: '/api/tts' })
    .post('/', async ({ body, error }: any) => {
        const { text, voice } = body;

        if (!text) {
            return error(400, "Text is required");
        }

        try {
            // console.log(`[TTS Proxy] Synthesizing: "${text.substring(0, 30)}..." (${voice})`);
            const tts = new EdgeTTS(text, voice || "en-US-GuyNeural");

            // Set timeout for synthesis to prevent hanging
            const result = await Promise.race([
                tts.synthesize(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("TTS Timeout")), 15000)
                )
            ]);

            if (!result.audio) {
                return error(500, "Failed to generate audio (No data)");
            }

            const buffer = await result.audio.arrayBuffer();
            const base64Audio = Buffer.from(buffer).toString('base64');

            return {
                audio: base64Audio,
                boundaries: result.subtitle || []
            };
        } catch (e: any) {
            console.error("[TTS Proxy] Error:", e);
            return error(500, e.message || "Internal TTS Error");
        }
    }, {
        body: t.Object({
            text: t.String(),
            voice: t.Optional(t.String())
        })
    });
