import { describe, expect, it, vi } from 'vitest';
import { POST as translatePost } from './translate/+server';
import { POST as filterPost } from './filter/+server';
import { POST as transcribePost } from './transcribe/+server';
import type { RequestEvent } from '@sveltejs/kit';

describe('Debug API Authentication', () => {
    const mockEvent = (session: any) => ({
        request: {} as Request,
        locals: {
            auth: vi.fn().mockResolvedValue(session)
        }
    } as unknown as RequestEvent);

    it('translate endpoint returns 401 if not authenticated', async () => {
        const event = mockEvent(null);
        const response = await translatePost(event);
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Unauthorized');
    });

    it('filter endpoint returns 401 if not authenticated', async () => {
        const event = mockEvent(null);
        const response = await filterPost(event);
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Unauthorized');
    });

    it('transcribe endpoint returns 401 if not authenticated', async () => {
        const event = mockEvent(null);
        const response = await transcribePost(event);
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Unauthorized');
    });
});
