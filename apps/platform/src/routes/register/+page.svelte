<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { UserPlus } from "lucide-svelte";
  import { signUpEmail } from "$lib/auth-client";

  const MIN_PASSWORD_LENGTH = 8;

  let isLoading = $state(false);
  let name = $state("");
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let errorMessage = $state("");

  async function handleRegister(e: Event) {
    e.preventDefault();
    isLoading = true;
    errorMessage = "";

    if (password !== confirmPassword) {
      errorMessage = "Passwords do not match";
      isLoading = false;
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      errorMessage = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
      isLoading = false;
      return;
    }

    const { error } = await signUpEmail(email, password, name, "/");

    if (error) {
      errorMessage = error;
      isLoading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-black/90 p-4">
  <Card.Root class="w-full max-w-md bg-zinc-900 border-zinc-800 shadow-2xl">
    <Card.Header class="space-y-1">
      <Card.Title class="text-2xl font-bold text-white text-center"
        >Create Account</Card.Title
      >
      <Card.Description class="text-zinc-400 text-center">
        Join Notflix and start learning with AI-powered content
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <form onsubmit={handleRegister} class="space-y-4">
        {#if errorMessage}
          <div
            class="p-3 text-sm bg-magenta-900/30 border border-magenta-900/50 text-magenta-500 rounded-md"
          >
            {errorMessage}
          </div>
        {/if}

        <div class="space-y-2">
          <label for="name" class="text-sm font-medium text-zinc-300"
            >Name</label
          >
          <input
            type="text"
            id="name"
            name="name"
            bind:value={name}
            placeholder="Your name"
            class="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-magenta-600 focus:border-transparent transition-all"
            required
          />
        </div>
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
            class="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-magenta-600 focus:border-transparent transition-all"
            required
          />
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
            placeholder="At least 8 characters"
            class="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-magenta-600 focus:border-transparent transition-all"
            required
          />
        </div>
        <div class="space-y-2">
          <label for="confirmPassword" class="text-sm font-medium text-zinc-300"
            >Confirm Password</label
          >
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            bind:value={confirmPassword}
            class="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-magenta-600 focus:border-transparent transition-all"
            required
          />
        </div>
        <Button
          type="submit"
          class="w-full bg-magenta-600 hover:bg-magenta-700 text-white font-bold"
          disabled={isLoading}
        >
          {#if isLoading}
            <span class="mr-2 animate-spin">⏳</span> Creating account...
          {:else}
            <UserPlus class="mr-2 h-4 w-4" /> Create Account
          {/if}
        </Button>
      </form>

      <div class="mt-4 text-center text-sm">
        <p class="text-zinc-500">
          Already have an account?
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href="/login" class="text-magenta-500 hover:underline">Sign in</a>
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</div>
