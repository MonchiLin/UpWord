
import { EdgeTTS } from 'edge-tts-universal';
import fs from 'fs';
import path from 'path';

// Define output path for the test audio file
const OUTPUT_FILE = path.join(process.cwd(), 'test-output.mp3');

async function testEdgeTTS() {
    console.log("🚀 Starting EdgeTTS Test...");
    console.log("-----------------------------------");

    try {
        const text = "Hello! This is a test of the universal Edge TTS library. If you can hear this, it's working properly.";
        const voice = "en-US-JennyNeural"; // Using a known good voice

        console.log(`🗣️  Synthesizing text: "${text}"`);
        console.log(`🎤 Voice: ${voice}`);

        const tts = new EdgeTTS(text, voice);

        console.log("⏳ Waiting for API response...");
        const result = await tts.synthesize();

        console.log("✅ Synthesis successful!");
        console.log("-----------------------------------");

        // Check Audio
        if (result.audio) {
            console.log(`🎵 Audio Blob received. Size: ${result.audio.size} bytes`);

            // In Node environment, we might need to handle Blob differently or it might return Buffer depending on how edge-tts-universal behaves in Node
            // The library documentation says it works in Node, let's see what we get.
            // If it's a standard Blob, arrayBuffer() works.

            const buffer = await result.audio.arrayBuffer();
            fs.writeFileSync(OUTPUT_FILE, Buffer.from(buffer));
            console.log(`💾 Saved audio to: ${OUTPUT_FILE}`);
        } else {
            console.error("❌ No audio data in result!");
        }

        // Check Subtitles (Word Boundaries)
        if (result.subtitle && Array.isArray(result.subtitle)) {
            console.log(`📝 Word Boundaries received: ${result.subtitle.length} items`);
            console.log("   First 3 items:", result.subtitle.slice(0, 3));
        } else {
            console.warn("⚠️  No word boundaries (subtitle) received. (This might be dependent on config)");
        }

    } catch (error) {
        console.error("💥 Error occurred during test:");
        console.error(error);
    }
}

testEdgeTTS();
