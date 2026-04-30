import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTP_STATUS } from '$lib/constants';
import { GET } from '../../src/routes/api/videos/[id]/subtitles/+server';

const VIDEO_ID = 'video-1';

const mockGenerateVtt = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/services/subtitle.service', () => ({
  SubtitleService: class {
    generateVtt = mockGenerateVtt;
  },
}));

describe('GET /api/videos/[id]/subtitles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns subtitle response when available', async () => {
    mockGenerateVtt.mockResolvedValue('WEBVTT\n');

    const response = await GET({
      params: { id: VIDEO_ID },
      locals: { db: {} },
      url: new URL('http://localhost/api/videos/video-1/subtitles?mode=native'),
    } as never);

    expect(response.status).toBe(HTTP_STATUS.OK);
    await expect(response.text()).resolves.toContain('WEBVTT');
  });

  it('maps errors to 404', async () => {
    mockGenerateVtt.mockRejectedValue(new Error('not found'));

    await expect(
      GET({
        params: { id: VIDEO_ID },
        locals: { db: {} },
        url: new URL(
          'http://localhost/api/videos/video-1/subtitles?mode=native',
        ),
      } as never),
    ).rejects.toMatchObject({ status: HTTP_STATUS.NOT_FOUND });
  });
});
