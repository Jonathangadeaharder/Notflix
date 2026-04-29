import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTP_STATUS } from '$lib/constants';
import { db } from '$lib/server/infrastructure/database';
import { GET } from '../../src/routes/api/health/+server';

vi.mock('$lib/server/infrastructure/database', () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok status when database is reachable', async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([] as never);

    const response = await GET({} as never);
    const body = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body.status).toBe('ok');
    expect(body.services.database).toBe('connected');
  });

  it('returns 503 when database check fails', async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error('DB down'));

    const response = await GET({} as never);
    const body = await response.json();

    expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
    expect(body.status).toBe('error');
  });
});
