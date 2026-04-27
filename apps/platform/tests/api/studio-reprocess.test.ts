import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTP_STATUS } from '$lib/constants';

vi.mock('$lib/server/infrastructure/database', () => ({
  db: {
    select: vi.fn(),
  },
}));
vi.mock('$lib/server/infrastructure/event-bus', () => ({
  eventBus: {
    emitAsync: vi.fn().mockResolvedValue(true),
  },
}));

describe('Studio reprocess action — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fail() when id is missing', { timeout: 15_000 }, async () => {
    const { actions } = await import('../../src/routes/studio/+page.server');
    const formData = new FormData();
    formData.append('targetLang', 'es');

    const result = await actions.reprocess({
      request: { formData: async () => formData } as never,
      locals: {
        auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }),
      },
    } as never);

    expect(result).toHaveProperty('status', HTTP_STATUS.BAD_REQUEST);
  });

  it('returns fail() when session is missing', {
    timeout: 15_000,
  }, async () => {
    const { actions } = await import('../../src/routes/studio/+page.server');
    const formData = new FormData();
    formData.append('id', '550e8400-e29b-41d4-a716-446655440000');
    formData.append('targetLang', 'es');

    const result = await actions.reprocess({
      request: { formData: async () => formData } as never,
      locals: {
        auth: vi.fn().mockResolvedValue(null),
      },
    } as never);

    expect(result).toHaveProperty('status', HTTP_STATUS.UNAUTHORIZED);
  });
});
