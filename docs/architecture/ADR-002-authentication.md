# ADR-002: Authentication Strategy

**Status:** Accepted
**Date:** 2026-03-07
**Context:** The platform needs user authentication for session management, vocabulary tracking, and personalized language learning.

## 1. Decision

We use the **Better Auth** library with a **Drizzle adapter** backed by PostgreSQL. Authentication is email + password only (no OAuth providers).

### Custom User Fields

The `user` table extends the standard Better Auth schema with learning-specific fields:

| Field                | Type    | Default | Purpose                           |
| :------------------- | :------ | :------ | :-------------------------------- |
| `nativeLang`         | string  | `"en"`  | User's native language            |
| `targetLang`         | string  | `"es"`  | Language being learned            |
| `gameIntervalMinutes`| number  | `10`    | Game & Watch flashcard frequency  |

## 2. Schema

Four authentication tables managed by Better Auth:

- **`user`** — Core profile (id, name, email, emailVerified, image) + custom fields above.
- **`session`** — DB-stored sessions (id, userId, token, expiresAt, ipAddress, userAgent). Sessions are **not** JWTs.
- **`account`** — Provider accounts (credential storage for email/password).
- **`verification`** — Email verification tokens.

All tables use UUID primary keys (`defaultRandom()`).

## 3. Integration

### Server-Side (`hooks.server.ts`)

Better Auth's `svelteKitHandler` wraps all incoming requests. Session resolution is lazy — `event.locals.auth()` only queries the database when a route actually calls it.

```typescript
export async function handle({ event, resolve }) {
    return requestContext.run({ requestId }, async () => {
        event.locals.auth = () => auth.api.getSession({
            headers: event.request.headers
        });
        return svelteKitHandler({ event, resolve, auth, building });
    });
}
```

### Server Configuration (`infrastructure/auth.ts`)

```typescript
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: { ...schema, user: schema.user, session: schema.session, account: schema.account, verification: schema.verification }
    }),
    user: {
        additionalFields: {
            nativeLang:          { type: "string", defaultValue: "en" },
            targetLang:          { type: "string", defaultValue: "es" },
            gameIntervalMinutes: { type: "number", defaultValue: 10 }
        }
    },
    emailAndPassword: { enabled: true }
});
```

### Client-Side (`auth-client.ts`)

```typescript
export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_BASE_URL || "http://localhost:5173"
});
export const { signIn, signOut, signUp, useSession } = authClient;
```

## 4. Consequences

- **Positive:** Session-based auth eliminates token refresh complexity. Custom profile fields are co-located with the auth user table, avoiding a separate profiles table. Better Auth handles session cleanup, CSRF, and cookie management automatically.
- **Negative:** No social login (OAuth) for now — acceptable for a local-first platform. All sessions are DB-backed, adding a query per authenticated request (mitigated by lazy resolution).
