import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../src/routes/api/videos/[id]/subtitles/+server';
import { SubtitleDeliveryError } from '$lib/server/services/subtitle-delivery.service';
import { HTTP_STATUS } from '$lib/constants';

const VIDEO_ID = 'video-1';

vi.mock('$lib/server/services/subtitle-delivery.service', () => ({
	SubtitleDeliveryError: class extends Error {
		status: number;

		constructor(status: number, message: string) {
			super(message);
			this.status = status;
		}
	}
}));

describe('GET /api/videos/[id]/subtitles', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns subtitle response when available', async () => {
		const generateVtt = vi.fn().mockResolvedValue('WEBVTT\n');

		const response = await GET({
			params: { id: VIDEO_ID },
			locals: { subtitleService: { generateVtt } },
			url: new URL('http://localhost/api/videos/video-1/subtitles?mode=native')
		} as never);

		expect(response.status).toBe(HTTP_STATUS.OK);
		await expect(response.text()).resolves.toContain('WEBVTT');
	});

	it('maps domain errors to http errors', async () => {
		const generateVtt = vi.fn().mockRejectedValue(
			new SubtitleDeliveryError(HTTP_STATUS.BAD_REQUEST, 'Invalid subtitle mode')
		);

		await expect(
			GET({
				params: { id: VIDEO_ID },
				locals: { subtitleService: { generateVtt } },
				url: new URL('http://localhost/api/videos/video-1/subtitles?mode=invalid')
			} as never)
		).rejects.toMatchObject({ status: HTTP_STATUS.NOT_FOUND });
	});
});
