import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/routes/api/process/[id]/+server';
import { HTTP_STATUS } from '$lib/constants';

const VIDEO_ID = 'video-1';
const LOCAL_URL = 'http://localhost';
const POST_METHOD = 'POST';

vi.mock('$lib/server/services/video-pipeline', () => ({
	processVideo: vi.fn().mockResolvedValue(undefined)
}));

describe('POST /api/process/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 400 when video id is missing', async () => {
		const { processVideo } = await import('$lib/server/services/video-pipeline');
		const response = await POST({
			params: { id: '' },
			locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) },
			request: new Request(LOCAL_URL, { method: POST_METHOD, body: '{}' })
		} as never);

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
		expect(processVideo).not.toHaveBeenCalled();
	});

	it('starts processing for valid payload', async () => {
		const { processVideo } = await import('$lib/server/services/video-pipeline');
		const response = await POST({
			params: { id: VIDEO_ID },
			locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) },
			request: new Request(LOCAL_URL, {
				method: POST_METHOD,
				body: JSON.stringify({ targetLang: 'es', nativeLang: 'en' }),
				headers: { 'content-type': 'application/json' }
			})
		} as never);

		expect(response.status).toBe(HTTP_STATUS.OK);
		// processVideo is called as fire-and-forget, so give it a tick
		await new Promise(r => setTimeout(r, 0));
		expect(processVideo).toHaveBeenCalledWith(VIDEO_ID, 'es', 'en', 'u1');
	});
});
