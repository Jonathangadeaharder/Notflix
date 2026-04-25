import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../../src/routes/api/videos/[id]/+server';
import { deleteVideoAndAssets } from '$lib/server/services/delete-video.service';
import { HTTP_STATUS } from '$lib/constants';

const VIDEO_ID = '550e8400-e29b-41d4-a716-446655440000';

vi.mock('$lib/server/services/delete-video.service', () => ({
	deleteVideoAndAssets: vi.fn()
}));

describe('DELETE /api/videos/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when service reports missing video', async () => {
		vi.mocked(deleteVideoAndAssets).mockResolvedValue({ ok: false, reason: 'NOT_FOUND' });

		const response = await DELETE({
			params: { id: VIDEO_ID },
			locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) }
		} as never);

		expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
	});

	it('returns success when deletion succeeds', async () => {
		vi.mocked(deleteVideoAndAssets).mockResolvedValue({ ok: true });

		const response = await DELETE({
			params: { id: VIDEO_ID },
			locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) }
		} as never);
		const body = await response.json();

		expect(response.status).toBe(HTTP_STATUS.OK);
		expect(body.success).toBe(true);
	});
});
