import { aiGateway } from '$lib/server/infrastructure/container';
import { generateSrt, secondsToSrtTime } from '$lib/server/utils/subtitle-utils';
import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '$lib/server/infrastructure/config';
import type { RequestHandler } from './$types';

const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const language = (formData.get('language') as string) || 'es';

        if (!file) {
            return json({ error: 'No file uploaded' }, { status: HTTP_STATUS_BAD_REQUEST });
        }

        const tempFilePath = await saveTempFile(file);
        
        try {
            const transcription = await aiGateway.transcribe(tempFilePath, language);
            
            const srtSegments = transcription.segments.map((seg, i) => ({
                index: i + 1,
                start: secondsToSrtTime(seg.start),
                end: secondsToSrtTime(seg.end),
                text: seg.text
            }));
            
            const srtContent = generateSrt(srtSegments);

            return new Response(srtContent, {
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Disposition': `attachment; filename="transcription.srt"`
                }
            });
        } finally {
            cleanupTempFile(tempFilePath);
        }

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Transcribe Debug Error:", message);
        return json({ error: message }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
    }
};

async function saveTempFile(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const targetDir = CONFIG.RESOLVED_UPLOAD_DIR;
    
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const tempFilePath = path.join(targetDir, `debug_upload_${Date.now()}_${file.name}`);
    fs.writeFileSync(tempFilePath, buffer);
    return tempFilePath;
}

function cleanupTempFile(filePath: string) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}