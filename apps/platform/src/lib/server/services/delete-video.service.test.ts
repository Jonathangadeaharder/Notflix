import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { deleteVideoAndAssets } from './delete-video.service';

const TEST_MEDIA_DIR = join(process.cwd(), '.test-media');
const VIDEO_PATH = join(TEST_MEDIA_DIR, 'video.mp4');
const THUMB_PATH = join(TEST_MEDIA_DIR, 'thumb.jpg');
const DELETE_FILE_CALLS = 2;

describe('deleteVideoAndAssets', () => {
	it('returns not found when video does not exist', async () => {
		const result = await deleteVideoAndAssets('missing', {
			getVideoById: vi.fn().mockResolvedValue(null)
		});

		expect(result).toEqual({ ok: false, reason: 'NOT_FOUND' });
	});

	it('deletes records and files when video exists', async () => {
		const deleteVideoProcessingById = vi.fn().mockResolvedValue(undefined);
		const deleteVideoById = vi.fn().mockResolvedValue(undefined);
		const deleteFile = vi.fn().mockResolvedValue(undefined);

		const result = await deleteVideoAndAssets('video-1', {
			getVideoById: vi.fn().mockResolvedValue({
				filePath: VIDEO_PATH,
				thumbnailPath: THUMB_PATH
			}),
			deleteVideoProcessingById,
			deleteVideoById,
			deleteFile
		});

		expect(result).toEqual({ ok: true });
		expect(deleteVideoProcessingById).toHaveBeenCalledWith('video-1');
		expect(deleteVideoById).toHaveBeenCalledWith('video-1');
		expect(deleteFile).toHaveBeenCalledTimes(DELETE_FILE_CALLS);
	});

	it('continues when file deletion fails', async () => {
		const result = await deleteVideoAndAssets('video-1', {
			getVideoById: vi.fn().mockResolvedValue({
				filePath: VIDEO_PATH,
				thumbnailPath: null
			}),
			deleteVideoProcessingById: vi.fn().mockResolvedValue(undefined),
			deleteVideoById: vi.fn().mockResolvedValue(undefined),
			deleteFile: vi.fn().mockRejectedValue(new Error('disk failure'))
		});

		expect(result).toEqual({ ok: true });
	});
});
