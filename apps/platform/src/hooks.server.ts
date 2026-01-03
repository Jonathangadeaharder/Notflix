import { auth } from "$lib/server/infrastructure/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { TIME } from "$lib/constants";

export async function handle({ event, resolve }) {
    // Inject mock session for E2E tests
    if (process.env.PLAYWRIGHT_TEST === 'true') {
        event.locals.auth = async () => ({
            user: {
                id: 'test-user-id',
                email: 'test@example.com',
                emailVerified: true,
                name: 'Test User',
                nativeLang: 'en',
                targetLang: 'es',
                createdAt: new Date(),
                updatedAt: new Date(),
                gameIntervalMinutes: parseFloat(process.env.TEST_GAME_INTERVAL || '10')
            },
            session: {
                id: 'test-session-id',
                userId: 'test-user-id',
                expiresAt: new Date(Date.now() + TIME.ONE_HOUR_MS),
                token: 'test-token',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });
    } else {
        event.locals.auth = () => auth.api.getSession({
            headers: event.request.headers
        });
    }

    return svelteKitHandler({ event, resolve, auth, building });
}