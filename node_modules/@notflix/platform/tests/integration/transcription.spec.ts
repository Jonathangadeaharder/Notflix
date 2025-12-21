import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// "Transcription Service" test
// Constraint: Use `tiny` whisper model (assumed running on backend)
// Constraint: Do not overmock (Use real API, real file)
// Constraint: Mock other services (Tests isolation of this endpoint)

const BRAIN_URL = process.env.BRAIN_URL || 'http://127.0.0.1:8000';
const HTTP_STATUS_OK = 200;

interface TranscriptionResponse {
    segments: { text: string }[];
    language: string;
}

test.describe('Transcription Service', () => {
    test('POST /transcribe should return segments using tiny model', async ({ request }) => {
        // 1. Prepare Test File (Real Audio)
        const audioFilePath = path.join(process.cwd(), '../../media', 'test_audio.mp3');

        if (!fs.existsSync(audioFilePath)) {
            test.skip(!fs.existsSync(audioFilePath), 'Test audio file not found: ' + audioFilePath);
            return;
        }

        // 2. Call API (Real Network)
        const response = await request.post(`${BRAIN_URL}/transcribe`, {
            data: {
                file_path: audioFilePath,
                language: 'es'
            }
        });

        // 3. Assertions
        if (!response.ok()) {
            console.error('API Error:', await response.text());
        }
        expect(response.status()).toBe(HTTP_STATUS_OK);

        const body = await response.json() as TranscriptionResponse;

        // Verify structure
        expect(body).toHaveProperty('segments');
        expect(body).toHaveProperty('language');

        const text = body.segments.map((s) => s.text).join(' ');
        console.log('Transcribed Text:', text);

        expect(text.toLowerCase()).toContain('prueba');
        expect(body.language).toBe('es');
    });
});