import { eq } from 'drizzle-orm';
import { db } from './database';
import { video } from '@notflix/database';
import type { IVideoRepository, DomainVideo } from '../domain/interfaces';

export class PostgresVideoRepository implements IVideoRepository {
    async getVideoById(id: string): Promise<DomainVideo | null> {
        const result = await db.select().from(video).where(eq(video.id, id)).execute();
        if (result.length === 0) return null;
        
        const row = result[0];
        return {
            id: row.id,
            title: row.title,
            filePath: row.filePath,
            duration: row.duration,
            published: row.published,
        };
    }

    async saveVideo(data: Partial<DomainVideo>): Promise<DomainVideo> {
        if (!data.title || !data.filePath) {
            throw new Error('title and filePath are required');
        }

        const insertData = {
            id: data.id,
            title: data.title,
            filePath: data.filePath,
            duration: data.duration ?? null,
            published: data.published ?? false,
        };

        const result = await db.insert(video).values(insertData).returning().execute();
        const row = result[0];
        
        return {
            id: row.id,
            title: row.title,
            filePath: row.filePath,
            duration: row.duration,
            published: row.published,
        };
    }

    async deleteVideo(id: string): Promise<void> {
        await db.delete(video).where(eq(video.id, id)).execute();
    }
}
