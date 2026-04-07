<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { LogIn } from "lucide-svelte";
  import { signInEmail, signUpEmail } from "$lib/auth-client";
  import { page } from "$app/stores";

  let isLoading = $state(false);
  let email = $state("");
  let password = $state("");
  let errorMessage = $state("");
  let fieldErrors = $state<{ email?: string; password?: string }>({});

  function getSafeCallbackUrl(next: string | null) {
    if (!next) return "/";
    if (!next.startsWith("/") || next.startsWith("//")) return "/";
    return next;
  }

  const callbackUrl = $derived(
    getSafeCallbackUrl($page.url.searchParams.get("next")),
  );

  async function handleLogin(e: Event) {
    e.preventDefault();
    fieldErrors = {};
    errorMessage = "";

    const errors: { email?: string; password?: string } = {};
    /* eslint-disable sonarjs/slow-regex, sonarjs/no-hardcoded-passwords */
    if (!email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Please enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < 6)
      errors.password = "Password must be at least 6 characters.";
    /* eslint-enable sonarjs/slow-regex, sonarjs/no-hardcoded-passwords */

    if (Object.keys(errors).length > 0) {
      fieldErrors = errors;
      return;
    }

    isLoading = true;

    const { error } = await signInEmail(email, password, callbackUrl);

    if (error) {
      errorMessage = error;
      isLoading = false;
    }
  }

  async function handleDemoLogin() {
    isLoading = true;
    errorMessage = "";

    // Attempt to sign up first (in case the user doesn't exist)
    const { error: signUpError } = await signUpEmail(
      "test@example.com",
      "password123",
      "Demo User",
      callbackUrl,
    );

    if (signUpError) {
      // If already exists, just sign in
      const { error: signInError } = await signInEmail(
        "test@example.com",
        "password123",
        callbackUrl,
      );

      if (signInError) {
        errorMessage = signInError;
        isLoading = false;
      }
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-black/90 p-4">
  <Card.Root class="w-full max-w-md bg-zinc-900 border-zinc-800 shadow-2xl">
    <Card.Header class="space-y-1">
      <Card.Title class="text-2xl font-bold text-white text-center"
        >Welcome Back</Card.Title
      >
      <Card.Description class="text-zinc-400 text-center">
        Enter your credentials to access your account
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <form onsubmit={handleLogin} novalidate class="space-y-4">
        {#if errorMessage}
          <div
            class="p-3 text-sm bg-magenta-900/30 border border-magenta-900/50 text-magenta-500 rounded-md"
          >
            {errorMessage}
          </div>
        {/if}

        <div class="space-y-2">
          <label for="email" class="text-sm font-medium text-zinc-300"
            >Email</label
          >
          <input
            type="email"
            id="email"
            name="email"
            bind:value={email}
            placeholder="name@example.com"
            class="w-full px-3 py-2 bg-black/50 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-magenta-600 focus:border-transparent transition-all {fieldErrors.email
              ? 'border-magenta-500'
              : 'border-zinc-700'}"
          />
          {#if fieldErrors.email}<p class="text-xs text-magenta-500 mt-1">
              {fieldErrors.email}
            </p>{/if}
        </div>
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium text-zinc-300"
            >Password</label
          >
          <input
            type="password"
            id="password"
            name="password"
            bind:value={password}
            class="w-full px-3 py-2 bg-black/50 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-magenta-600 focus:border-transparent transition-all {fieldErrors.password
              ? 'border-magenta-500'
              : 'border-zinc-700'}"
          />
          {#if fieldErrors.password}<p class="text-xs text-magenta-500 mt-1">
              {fieldErrors.password}
            </p>{/if}
        </div>
        <Button
          type="submit"
          class="w-full bg-magenta-600 hover:bg-magenta-700 text-white font-bold"
          disabled={isLoading}
        >
          {#if isLoading}
            <span class="mr-2 animate-spin">⏳</span> Processing...
          {:else}
            <LogIn class="mr-2 h-4 w-4" /> Sign In
          {/if}
        </Button>

        <div class="relative py-4">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-zinc-800"></span>
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-zinc-900 px-2 text-zinc-500 font-medium"
              >Or for testing</span
            >
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          class="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onclick={handleDemoLogin}
          disabled={isLoading}
        >
          🚀 Demo Login (One-click)
        </Button>
      </form>

      <div class="mt-4 text-center text-sm">
        <p class="text-zinc-500">
          Don't have an account?
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href="/register" class="text-magenta-500 hover:underline"
            >Sign up</a
          >
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</div>
