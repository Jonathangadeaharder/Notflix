import type { SupabaseClient } from '@supabase/supabase-js';
import { goto } from '$app/navigation';
import { env as publicEnv } from '$env/dynamic/public';

let _supabase: SupabaseClient | null = null;

async function getSupabaseClient(): Promise<SupabaseClient> {
  if (!_supabase) {
    const { createBrowserClient } = await import('@supabase/ssr');
    _supabase = createBrowserClient(
      publicEnv.PUBLIC_SUPABASE_URL || '',
      publicEnv.PUBLIC_SUPABASE_ANON_KEY || '',
    );
  }
  return _supabase;
}

export async function signInEmail(
  email: string,
  password: string,
  callbackUrl = '/',
): Promise<{ error?: string }> {
  const { error } = await (await getSupabaseClient()).auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message };
  await goto(callbackUrl);
  return {};
}

export async function signOut(callbackUrl = '/'): Promise<{ error?: string }> {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  await goto(callbackUrl);
  return {};
}

export async function signUpEmail(
  email: string,
  password: string,
  name: string,
  callbackUrl = '/',
): Promise<{ error?: string; success?: boolean }> {
  const { error } = await (await getSupabaseClient()).auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };

  const { error: signInError } = await (
    await getSupabaseClient()
  ).auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) return { error: 'Account created but sign in failed' };

  await goto(callbackUrl);
  return { success: true };
}
