import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTP_STATUS } from '$lib/constants';
import { POST } from '../../src/routes/api/process/[id]/+server';

const VIDEO_ID = 'video-1';
const LOCAL_URL = 'http://localhost';
const POST_METHOD = 'POST';

vi.mock('$lib/server/infrastructure/event-bus', () => ({
  eventBus: {
    emitAsync: vi.fn().mockResolvedValue(true),
  },
}));

describe('POST /api/process/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when video id is missing', async () => {
    const { eventBus } = await import('$lib/server/infrastructure/event-bus');
    const response = await POST({
      params: { id: '' },
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) },
      request: new Request(LOCAL_URL, { method: POST_METHOD, body: '{}' }),
    } as never);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(eventBus.emitAsync).not.toHaveBeenCalled();
  });

  it('starts processing for valid payload', async () => {
    const { eventBus } = await import('$lib/server/infrastructure/event-bus');
    const response = await POST({
      params: { id: VIDEO_ID },
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) },
      request: new Request(LOCAL_URL, {
        method: POST_METHOD,
        body: JSON.stringify({ targetLang: 'es', nativeLang: 'en' }),
        headers: { 'content-type': 'application/json' },
      }),
    } as never);

    expect(response.status).toBe(HTTP_STATUS.OK);
    // emitAsync is called as fire-and-forget, so give it a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(eventBus.emitAsync).toHaveBeenCalledWith(
      'video.processing.started',
      {
        videoId: VIDEO_ID,
        targetLang: 'es',
        nativeLang: 'en',
        userId: 'u1',
      },
    );
  });
});
