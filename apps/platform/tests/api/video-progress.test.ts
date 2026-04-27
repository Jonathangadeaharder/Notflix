import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTP_STATUS } from '$lib/constants';
import { ProcessingStatus } from '$lib/server/infrastructure/config';
import { ProgressStage } from '$lib/types';
import { GET } from '../../src/routes/api/videos/[id]/progress/+server';

const VIDEO_ID = 'video-123';
const USER_ID = 'user-123';

vi.mock('$lib/server/infrastructure/database', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('GET /api/videos/[id]/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    const response = await GET({
      params: { id: VIDEO_ID },
      locals: { auth: vi.fn().mockResolvedValue(null) },
      url: new URL('http://localhost'),
    } as any);

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it('returns progress data from database', async () => {
    const { db } = await import('$lib/server/infrastructure/database');

    // Mock double select (processing + watchProgress)
    (db.select as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                status: ProcessingStatus.PROCESSING,
                progressStage: ProgressStage.TRANSCRIBING,
                progressPercent: 45,
              },
            ]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                currentTime: 10,
                duration: 100,
                progressPercent: 10,
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      });

    const response = await GET({
      params: { id: VIDEO_ID },
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: USER_ID } }) },
      url: new URL('http://localhost?targetLang=es'),
    } as any);

    expect(response.status).toBe(HTTP_STATUS.OK);
    const data = await response.json();
    expect(data.status).toBe(ProcessingStatus.PROCESSING);
    expect(data.progressStage).toBe(ProgressStage.TRANSCRIBING);
    expect(data.progressPercent).toBe(45);
    expect(data.watchProgress).not.toBeNull();
  });

  it('returns default values if no processing record exists', async () => {
    const { db } = await import('$lib/server/infrastructure/database');

    (db.select as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

    const response = await GET({
      params: { id: VIDEO_ID },
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: USER_ID } }) },
      url: new URL('http://localhost'),
    } as any);

    expect(response.status).toBe(HTTP_STATUS.OK);
    const data = await response.json();
    expect(data.status).toBe(ProcessingStatus.PENDING);
    expect(data.progressStage).toBe(ProgressStage.QUEUED);
    expect(data.progressPercent).toBe(0);
  });
});
