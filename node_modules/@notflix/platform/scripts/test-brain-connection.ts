import { aiGateway } from '../src/lib/server/infrastructure/container';
import path from 'path';

const DEFAULT_JSON_INDENT = 2;

// Mock process.env for the test if running outside full environment
if (!process.env.BRAIN_URL) {
    process.env.BRAIN_URL = 'http://127.0.0.1:8000';
}

async function runIntegrationTest() {
    console.log('Testing Brain Service Integration (via AiGateway)...');

    try {
        // Test 1: Analyze
        console.log('\n--- Testing /filter ---');
        const text = "Integration testing is crucial.";
        const analysis = await aiGateway.analyzeBatch([text], 'en');
        console.log('Analyze Result:', JSON.stringify(analysis, null, DEFAULT_JSON_INDENT));

        if (analysis.results.length > 0) {
            console.log('✅ Analyze Success');
        } else {
            console.error('❌ Analyze returned empty results');
        }

        // Test 2: Transcribe
        console.log('\n--- Testing /transcribe ---');
        const audioPath = path.resolve(process.cwd(), '../../media/test_audio.mp3');

        try {
            const transcription = await aiGateway.transcribe(audioPath, 'es');
            console.log('Transcribe Result Language:', transcription.language);
            console.log('Transcribe Prob:', transcription.language_probability);
            console.log('Segments count:', transcription.segments.length);
            if (transcription.segments.length > 0) {
                console.log('✅ Transcribe Success');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('❌ Transcribe Check Failed (File likely missing or service error):', message);
        }

    } catch (error) {
        console.error('❌ Integration Test Fatal Error:', error);
    }
}

runIntegrationTest();
