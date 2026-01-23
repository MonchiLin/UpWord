import { join } from 'path';

export interface TTSResult {
    audio: string; // Base64 encoded audio
    boundaries: any[]; // Word boundary information
}

export interface TTSOptions {
    rate?: string;
    pitch?: string;
    volume?: string; // Not currently used by the python script but kept for interface compatibility if needed
}

export const generateSpeech = async (
    text: string,
    voice: string,
    options: TTSOptions = {}
): Promise<TTSResult> => {
    const scriptPath = join(process.cwd(), 'src', 'scripts', 'tts_bridge.py');

    // Command line arguments for the python script
    const args = [
        'python',
        scriptPath,
        '--text', text,
        '--voice', voice,
        '--rate', options.rate || '+0%',
        '--pitch', options.pitch || '+0Hz'
    ];

    try {
        const proc = Bun.spawn(args, {
            stdout: "pipe",
            stderr: "pipe",
        });

        const output = await new Response(proc.stdout).text();
        const error = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
            console.error('[EdgeTTSService] Python script failed:', error);
            throw new Error(`TTS generation failed: ${error || 'Unknown error'}`);
        }

        if (!output.trim()) {
            throw new Error('TTS generation returned empty output');
        }

        try {
            return JSON.parse(output.trim());
        } catch (parseError) {
            console.error('[EdgeTTSService] Failed to parse JSON output which was:', output);
            throw new Error('Invalid response from TTS service');
        }
    } catch (e) {
        console.error('[EdgeTTSService] Spawn error:', e);
        throw e;
    }
};

export interface Voice {
    Name: string;
    ShortName: string;
    Gender: string;
    Locale: string;
    FriendlyName: string;
}

export const getVoices = async (): Promise<Voice[]> => {
    const scriptPath = join(process.cwd(), 'src', 'scripts', 'tts_bridge.py');
    const args = ['python', scriptPath, '--list-voices'];

    try {
        const proc = Bun.spawn(args, {
            stdout: "pipe",
            stderr: "pipe",
        });

        const output = await new Response(proc.stdout).text();
        const error = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
            console.error('[EdgeTTSService] Failed to get voices:', error);
            throw new Error(`Failed to get voices: ${error || 'Unknown error'}`);
        }

        return JSON.parse(output.trim());
    } catch (e) {
        console.error('[EdgeTTSService] Spawn error:', e);
        throw e;
    }
};
