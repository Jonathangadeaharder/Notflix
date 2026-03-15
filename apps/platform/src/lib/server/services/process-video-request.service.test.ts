import { describe, it, expect, vi } from 'vitest';
import { startVideoProcessing } from './process-video-request.service';

describe('startVideoProcessing', () => {
	it('queues processing with defaults', () => {
		const queueTask = vi.fn();
		const processVideo = vi.fn().mockResolvedValue(undefined);

		startVideoProcessing(
			{ videoId: 'video-1', userId: 'user-1' },
			{
				queueTask,
				processVideo
			}
		);

		expect(processVideo).toHaveBeenCalledWith('video-1', 'es', 'en', 'user-1');
		expect(queueTask).toHaveBeenCalledWith('processVideo:video-1', expect.any(Promise));
	});

	it('throws when video id is missing', () => {
		expect(() =>
			startVideoProcessing(
				{ videoId: '', userId: 'user-1' },
				{
					queueTask: vi.fn(),
					processVideo: vi.fn()
				}
			)
		).toThrow('Missing videoId');
	});
});
