import { test, expect } from '@playwright/test';
/* eslint-disable test-smells/conditional-test-logic, test-smells/assertion-roulette */
import fs from 'fs';
import path from 'path';
import { HTTP_STATUS } from '../../src/lib/constants';

// "Transcription Service" test
// Constraint: Use `tiny` whisper model (assumed running on backend)
// Constraint: Do not overmock (Use real API, real file)
// Constraint: Mock other services (Tests isolation of this endpoint)

const BRAIN_URL = process.env.BRAIN_URL || 'http://127.0.0.1:8000';

interface TranscriptionResponse {
    segments: { text: string }[];
    language: string;
}

test.describe('Transcription Service', () => {
    test.beforeAll(() => {
        const audioFilePath = path.join(process.cwd(), '../../media', 'test_audio.mp3');
        if (!fs.existsSync(audioFilePath)) {
            // Throwing in beforeAll fails the suite cleanly without conditional logic inside the test
            throw new Error(`Test audio file not found at: ${audioFilePath}`);
        }
    });

    test('POST /transcribe should return segments using tiny model', async ({ request }) => {
        // 1. Prepare Test File (Real Audio)
        const audioFilePath = path.join(process.cwd(), '../../media', 'test_audio.mp3');

        // 2. Call API (Real Network)
        const response = await request.post(`${BRAIN_URL}/transcribe`, {
            headers: {
                'X-API-Key': process.env.AI_SERVICE_API_KEY || 'dev_secret_key'
            },
            data: {
                file_path: audioFilePath,
                language: 'es'
            }
        });

        // 3. Assertions
        expect(response.status(), `API returned ${response.status()} - ${await response.text()}`).toBe(HTTP_STATUS.OK);

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