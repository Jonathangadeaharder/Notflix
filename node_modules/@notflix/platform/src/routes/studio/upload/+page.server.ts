import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/infrastructure/database';
import { video } from '@notflix/database';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import { orchestrator } from '$lib/server/infrastructure/container';
import { CONFIG } from '$lib/server/infrastructure/config';
import { z } from 'zod';
import { taskRegistry } from '$lib/server/services/task-registry.service';
import type { User } from '$lib/server/infrastructure/auth';

import { HTTP_STATUS, LIMITS } from '$lib/constants';

const MIN_LANG_LEN = 2;
const MAX_LANG_LEN = 5;

// Define schema for validation
const uploadSchema = z.object({
    title: z.string().min(1, 'Title is required').max(LIMITS.MAX_TITLE_LENGTH),
    targetLang: z.string().min(MIN_LANG_LEN).max(MAX_LANG_LEN).default('es'),
});

export const load = async () => {
    return {
        initialData: {
            title: '',
            targetLang: 'es'
        }
    };
};

export const actions = {
    upload: async ({ request, locals }) => {
        const session = await locals.auth();
        const formData = await request.formData();
        
        const title = formData.get('title') as string;
        const targetLang = formData.get('targetLang') as string;
        const file = formData.get('file') as File;

        const result = uploadSchema.safeParse({ title, targetLang });

        if (!result.success || !file || file.size === 0) {
            const fieldErrors = result.success ? {} : result.error.flatten().fieldErrors;
            const fileErrors = (!file || file.size === 0) ? ['File is required'] : [];
            
            return fail(HTTP_STATUS.BAD_REQUEST, { 
                errors: {
                    ...fieldErrors,
                    file: fileErrors.length > 0 ? fileErrors : undefined
                },
                data: { title, targetLang }
            });
        }

        const videoId = crypto.randomUUID();
        const filePath = await saveUploadedFile(file, videoId);

        await db.insert(video).values({
            id: videoId,
            title: result.data.title,
            filePath: filePath,
            thumbnailPath: '/placeholder.jpg',
            views: 0,
            published: true
        });

        queueProcessing(videoId, result.data.targetLang, session?.user);

        throw redirect(HTTP_STATUS.SEE_OTHER, '/studio'); // 303 is standard for redirects after post
    }
};

async function saveUploadedFile(file: File, videoId: string): Promise<string> {
    const targetDir = CONFIG.RESOLVED_UPLOAD_DIR;
    await mkdir(targetDir, { recursive: true });

    const ext = file.name.split('.').pop();
    const fileName = `${videoId}.${ext}`;
    const filePath = join(targetDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    return filePath;
}

function queueProcessing(videoId: string, targetLang: string, user: User | undefined) {
    taskRegistry.register(
        `processVideo:${videoId}`,
        orchestrator.processVideo(
            videoId,
            targetLang,
            user?.nativeLang || CONFIG.DEFAULT_NATIVE_LANG,
            user?.id
        )
    );
}
