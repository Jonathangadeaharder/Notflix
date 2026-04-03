import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/routes/api/process/[id]/+server';
import { triggerPipeline } from '$lib/server/services/pipeline-trigger';
import { HTTP_STATUS } from '$lib/constants';

const VIDEO_ID = 'video-1';
const LOCAL_URL = 'http://localhost';
const POST_METHOD = 'POST';

vi.mock('$lib/server/services/pipeline-trigger', () => ({
	triggerPipeline: vi.fn()
}));

describe('POST /api/process/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		const response = await POST({
			params: { id: VIDEO_ID },
			locals: { auth: vi.fn().mockResolvedValue(null) },
			request: new Request(LOCAL_URL, { method: POST_METHOD, body: '{}' })
		} as never);

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
	});

	it('returns 400 when video id is missing', async () => {
		const response = await POST({
			params: { id: '' },
			locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) },
			request: new Request(LOCAL_URL, { method: POST_METHOD, body: '{}' })
		} as never);

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
	});

	it('starts processing for valid payload', async () => {
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
		expect(triggerPipeline).toHaveBeenCalledWith(
			expect.objectContaining({
				videoId: VIDEO_ID,
				userId: 'u1',
				targetLang: 'es',
				nativeLang: 'en'
			})
		);
	});
});
