import { createBrowserClient } from "@supabase/ssr";
import { env as publicEnv } from "$env/dynamic/public";
import { goto } from "$app/navigation";
import { page } from "$app/stores";

const supabase = createBrowserClient(
  publicEnv.PUBLIC_SUPABASE_URL || "",
  publicEnv.PUBLIC_SUPABASE_ANON_KEY || "",
);

export async function signInEmail(
  email: string,
  password: string,
  callbackUrl = "/",
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  await goto(callbackUrl);
  return {};
}

export async function signUpEmail(
  email: string,
  password: string,
  name: string,
  callbackUrl = "/",
): Promise<{ error?: string; success?: boolean }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) return { error: "Account created but sign in failed" };

  // eslint-disable-next-line svelte/no-navigation-without-resolve
  await goto(callbackUrl);
  return { success: true };
}

export async function signOut(callbackUrl = "/login"): Promise<void> {
  await supabase.auth.signOut();
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  await goto(callbackUrl);
}

export { page };
