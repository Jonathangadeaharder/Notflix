import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import type { RequestEvent } from "@sveltejs/kit";
import { db } from "./database";
import { user as userTable } from "@notflix/database";
import { eq } from "drizzle-orm";
import type { User as DbUser } from "@notflix/database";

export type User = DbUser;

// eslint-disable-next-line no-magic-numbers
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface Session {
  user: User;
  expires: string;
}

function requireEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
}

export function createSupabaseServerClient(event: RequestEvent) {
  const supabaseUrl = env.SUPABASE_URL ?? publicEnv.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
  return createServerClient(
    requireEnv(supabaseUrl, "SUPABASE_URL"),
    requireEnv(supabaseAnonKey, "PUBLIC_SUPABASE_ANON_KEY"),
    {
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
            event.cookies.set(name, value, { ...options, path: "/" }),
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
  if (existing[0]) return existing[0];

  const name =
    (authUser.user_metadata?.name as string | undefined) ||
    authUser.email ||
    "User";
  const [created] = await db
    .insert(userTable)
    .values({
      id: authUser.id,
      name,
      email: authUser.email!,
      emailVerified: authUser.email_confirmed_at != null,
      nativeLang: "en",
      targetLang: "es",
      gameIntervalMinutes: 10,
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
