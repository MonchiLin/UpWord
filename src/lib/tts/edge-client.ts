import { apiFetch } from '../api';
import type { TTSResult, WordBoundary } from './types';

export class EdgeTTSClient {
    private readonly voice: string;

    // static reference to currently playing audio for single-instance playback
    private static currentAudio: HTMLAudioElement | null = null;

    constructor(voice: string = "en-US-GuyNeural") {
        this.voice = voice;
    }

    /**
     * Synthesize text to speech via Backend Proxy
     */
    async synthesize(text: string, rate: number = 1.0): Promise<TTSResult> {
        try {
            // Call backend proxy
            const response = await apiFetch<{ audio: string; boundaries: any[] }>('/api/tts', {
                method: 'POST',
                body: JSON.stringify({
                    text,
                    voice: this.voice
                })
            });

            // Decode Base64 audio to Blob
            const binaryString = atob(response.audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });

            // Process boundaries
            // Backend returns raw boundaries from edge-tts-universal
            // Structure: { offset, duration, text } (offset/duration in 100nm)
            const boundaries: WordBoundary[] = [];
            let lastTextOffset = 0;
            const rawBoundaries = response.boundaries || [];

            for (const b of rawBoundaries) {
                const wordText = b.text;

                // Manual Offset Calculation (Required for sentence syncing)
                // We search for the word in the original text to find its character index
                let currentOffset = lastTextOffset;
                if (wordText) {
                    const searchStart = lastTextOffset;
                    // Simple search - matching the logic from the previous implementation
                    const foundIndex = text.toLowerCase().indexOf(wordText.toLowerCase(), searchStart);

                    if (foundIndex !== -1) {
                        currentOffset = foundIndex;
                        lastTextOffset = foundIndex + wordText.length;
                    }
                }

                // Convert 100-nanosecond units (HNS) to milliseconds
                // 1 ms = 10,000 HNS
                boundaries.push({
                    audioOffset: b.offset / 10000,
                    duration: b.duration / 10000,
                    text: wordText,
                    textOffset: currentOffset,
                    wordLength: wordText ? wordText.length : 0
                });
            }

            return {
                audioBlob: blob,
                wordBoundaries: boundaries
            };

        } catch (e) {
            console.error("TTS Proxy Error:", e);
            throw e;
        }
    }

    cancel() {
        // no-op
    }

    /**
     * Helper to play text directly
     * @param text The text to speak
     * @param voice Optional voice ID (defaults to 'en-US-GuyNeural')
     */
    static async play(text: string, voice?: string): Promise<void> {
        // 1. Stop previous audio if playing
        if (EdgeTTSClient.currentAudio) {
            EdgeTTSClient.currentAudio.pause();
            EdgeTTSClient.currentAudio.currentTime = 0;
            EdgeTTSClient.currentAudio = null;
        }

        // 2. Synthesize with specific voice (or default)
        const client = new EdgeTTSClient(voice);
        const result = await client.synthesize(text);
        const audioUrl = URL.createObjectURL(result.audioBlob);
        const audio = new Audio(audioUrl);

        // 3. Track current audio
        EdgeTTSClient.currentAudio = audio;

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                URL.revokeObjectURL(audioUrl);
                if (EdgeTTSClient.currentAudio === audio) {
                    EdgeTTSClient.currentAudio = null;
                }
            };

            audio.onended = () => {
                cleanup();
                resolve();
            };
            audio.onerror = (e) => {
                cleanup();
                reject(e);
            };

            audio.play().catch((e) => {
                cleanup();
                // AbortError is common when we pause() to start a new one, ignore it
                if (e.name !== 'AbortError') {
                    reject(e);
                }
            });
        });
    }
}
