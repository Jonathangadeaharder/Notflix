import { auth } from "$lib/server/infrastructure/auth";
import { toSvelteKitHandler } from "better-auth/svelte-kit";

export const fallback = toSvelteKitHandler(auth);
