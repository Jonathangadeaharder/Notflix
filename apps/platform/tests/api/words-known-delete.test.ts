import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTP_STATUS } from '$lib/constants';
import { db } from '$lib/server/infrastructure/database';
import { DELETE } from '../../src/routes/api/words/known/+server';

const WORDS_KNOWN_URL = 'http://localhost/api/words/known';

vi.mock('$lib/server/infrastructure/database', () => ({
  db: {
    delete: vi.fn(),
  },
}));

describe('DELETE /api/words/known', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('WhenUnauthorized_Returns401', async () => {
    const request = new Request(WORDS_KNOWN_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lemma: 'hola', lang: 'es' }),
    });

    const response = await DELETE({
      request,
      locals: { auth: vi.fn().mockResolvedValue(null) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it('WhenInvalidBody_Returns400', async () => {
    const request = new Request(WORDS_KNOWN_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lemma: 'hola' }),
    });

    const response = await DELETE({
      request,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('WhenWordNotKnown_Returns404', async () => {
    const chain = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValueOnce([]),
    };
    vi.mocked(db.delete).mockReturnValue(chain as never);

    const request = new Request(WORDS_KNOWN_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lemma: 'hola', lang: 'es' }),
    });

    const response = await DELETE({
      request,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it('WhenWordKnown_DeletesAndReturns200', async () => {
    const chain = {
      where: vi.fn().mockReturnThis(),
      returning: vi
        .fn()
        .mockResolvedValueOnce([{ userId: 'u1', lemma: 'hola', lang: 'es' }]),
    };
    vi.mocked(db.delete).mockReturnValue(chain as never);

    const request = new Request(WORDS_KNOWN_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lemma: 'hola', lang: 'es' }),
    });

    const response = await DELETE({
      request,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }) },
    } as never);
    const body = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body.success).toBe(true);
  });
});
