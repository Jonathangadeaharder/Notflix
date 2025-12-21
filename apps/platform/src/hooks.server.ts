import { auth } from "$lib/server/infrastructure/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";

export async function handle({ event, resolve }) {
    event.locals.auth = () => auth.api.getSession({
        headers: event.request.headers
    });
	return svelteKitHandler({ event, resolve, auth, building });
}