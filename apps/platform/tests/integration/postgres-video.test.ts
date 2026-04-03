import { describe, it, expect, beforeAll } from 'vitest';
import { PostgresVideoRepository } from '../../src/lib/server/infrastructure/postgres-video.repository';
import { db } from '../../src/lib/server/infrastructure/database';
// @ts-ignore
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';

describe('PostgresVideoRepository', () => {
    let repo: PostgresVideoRepository;

    beforeAll(async () => {
        // Testcontainers spun up our isolated db, now we migrate it before we test
        try {
            await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../../../packages/database/migrations') });
        } catch (e) {
            console.error('Migration failed, fallback to push or schema might already exist', e);
        }
        repo = new PostgresVideoRepository();
    });

    it('should save a video and retrieve it structurally decoupling the database from the application', async () => {
        const mockVideo = {
            title: 'Ephemeral Integration Test Video',
            filePath: '/integration/test.mp4',
            duration: 120,
            published: true
        };

        const saved = await repo.saveVideo(mockVideo);

        expect(saved.id).toBeDefined();
        expect(saved.title).toBe(mockVideo.title);
        expect(saved.published).toBe(true);

        const retrieved = await repo.getVideoById(saved.id);
        
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(saved.id);
        expect(retrieved?.duration).toBe(120);

        // Cleanup
        await repo.deleteVideo(saved.id);

        const deleted = await repo.getVideoById(saved.id);
        expect(deleted).toBeNull();
    });
});
