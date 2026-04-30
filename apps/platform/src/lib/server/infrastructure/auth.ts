import type { CookieOptions } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { INDICES } from '$lib/constants';
import type { User as DbUser } from '$lib/server/db/schema';
import {
  DEFAULT_GAME_INTERVAL_MINUTES,
  user as userTable,
} from '$lib/server/db/schema';
import { db } from './database';

export type User = DbUser;

const SESSION_EXPIRY_DAYS = 7;
const MS_PER_DAY = 86_400_000;
const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * MS_PER_DAY;

export interface Session {
  user: User;
  expires: string;
}

function extractRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function buildRewrittenRequest(
  input: RequestInfo | URL,
  rewrittenUrl: string,
): RequestInfo {
  if (typeof input === 'string' || input instanceof URL) return rewrittenUrl;
  return new Request(rewrittenUrl, input);
}

function createDockerAwareFetch(
  publicUrl: string,
  internalUrl: string,
): typeof fetch {
  return (input, init) => {
    const url = extractRequestUrl(input);
    let rewritten = url;
    if (publicUrl && internalUrl && internalUrl !== publicUrl) {
      try {
        const parsed = new URL(url);
        const publicParsed = new URL(publicUrl);
        if (
          parsed.origin === publicParsed.origin &&
          parsed.pathname.startsWith(publicParsed.pathname)
        ) {
          const internalParsed = new URL(internalUrl);
          parsed.protocol = internalParsed.protocol;
          parsed.host = internalParsed.host;
          rewritten = parsed.href;
        }
      } catch {
        rewritten = url;
      }
    }
    const request = buildRewrittenRequest(input, rewritten);
    return fetch(request, init);
  };
}

function createSupabaseServerClient(event: RequestEvent) {
  const publicUrl = publicEnv.PUBLIC_SUPABASE_URL || '';
  const internalUrl = env.SUPABASE_URL || publicUrl;
  const customFetch = createDockerAwareFetch(publicUrl, internalUrl);

  return createServerClient(
    publicUrl,
    publicEnv.PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: { fetch: customFetch },
      cookies: {
        getAll() {
          return event.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            event.cookies.set(name, value, { ...options, path: '/' }),
          );
        },
      },
    },
  );
}

type SupabaseAuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

async function upsertProfile(authUser: SupabaseAuthUser): Promise<User | null> {
  const existing = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, authUser.id))
    .limit(1);
  if (existing[INDICES.FIRST]) return existing[INDICES.FIRST];

  const name =
    (authUser.user_metadata?.name as string | undefined) ||
    authUser.email ||
    'User';
  const [created] = await db
    .insert(userTable)
    .values({
      id: authUser.id,
      name,
      email: authUser.email ?? '',
      emailVerified: authUser.email_confirmed_at != null,
      nativeLang: 'en',
      targetLang: 'es',
      gameIntervalMinutes: DEFAULT_GAME_INTERVAL_MINUTES,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  return created ?? null;
}

export async function resolveSession(
  event: RequestEvent,
): Promise<Session | null> {
  const supabase = createSupabaseServerClient(event);
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const profile = await upsertProfile(authUser);
  if (!profile) return null;

  return {
    user: profile,
    expires: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString(),
  };
}
