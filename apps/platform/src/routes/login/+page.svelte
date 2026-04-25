<script lang="ts">
  import Play from "lucide-svelte/icons/play";
  import Sparkles from "lucide-svelte/icons/sparkles";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import { signInEmail, signUpEmail } from "$lib/auth-client";
  import { page } from "$app/stores";
  import { resolve } from "$app/paths";

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
    const MIN_PASSWORD_LENGTH = 8;
    if (!password) errors.password = "Password is required.";
    else if (password.length < MIN_PASSWORD_LENGTH)
      errors.password = "Password must be at least 8 characters.";
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

    const { error: signUpError } = await signUpEmail(
      "test@example.com",
      "password123",
      "Demo User",
      callbackUrl,
    );

    if (signUpError) {
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

  const stats = [
    { v: "4,281", l: "lemmas tracked" },
    { v: "100%", l: "local-first" },
    { v: "0ms", l: "streaming delay" },
  ];
</script>

<svelte:head>
  <title>Sign in · Notflix</title>
</svelte:head>

<div
  class="min-h-screen relative overflow-hidden"
  style:background="var(--bg)"
  style:color="var(--fg)"
>
  <div class="absolute inset-0 atmo-glow pointer-events-none"></div>
  <div class="absolute inset-0 atmo-grid pointer-events-none"></div>

  <div
    class="relative z-10 grid min-h-screen"
    style:grid-template-columns="1.1fr 1fr"
  >
    <div class="hidden lg:flex flex-col justify-between" style:padding="60px">
      <a href={resolve("/")} class="flex items-center gap-2.5">
        <div
          class="w-8 h-8 rounded-[8px] grid place-items-center text-white"
          style:background="var(--brand)"
        >
          <Play class="h-4 w-4 fill-current" />
        </div>
        <span
          class="font-display font-extrabold"
          style:font-size="20px"
          style:letter-spacing="-0.03em">Notflix</span
        >
      </a>

      <div>
        <div
          class="font-mono uppercase mb-4"
          style:font-size="11px"
          style:letter-spacing="0.14em"
          style:color="var(--brand-hi)"
        >
          Cinema for language learners
        </div>
        <h1
          class="font-display font-extrabold"
          style:font-size="60px"
          style:letter-spacing="-0.04em"
          style:line-height="1"
          style:margin="0"
        >
          Watch a movie.
          <br />
          <span
            style:background="linear-gradient(90deg, var(--brand-hi),
            var(--learn-hi))"
            style:-webkit-background-clip="text"
            style:background-clip="text"
            style:-webkit-text-fill-color="transparent"
            style:color="transparent"
          >
            Learn the words<br />you don't know.
          </span>
        </h1>
        <p
          class="text-[17px] mt-5 max-w-[440px]"
          style:color="var(--fg-2)"
          style:line-height="1.55"
        >
          Upload any video. Notflix transcribes it, finds the words you don't
          know yet, and turns the gaps into between-scene flashcards. Fully
          local, fully yours.
        </p>

        <div class="flex gap-7 mt-9">
          {#each stats as s (s.l)}
            <div>
              <div
                class="font-display font-extrabold"
                style:font-size="26px"
                style:letter-spacing="-0.025em"
              >
                {s.v}
              </div>
              <div
                class="font-mono uppercase mt-0.5"
                style:font-size="10px"
                style:color="var(--fg-3)"
                style:letter-spacing="0.1em"
              >
                {s.l}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div
        class="font-mono"
        style:font-size="11px"
        style:color="var(--fg-3)"
        style:letter-spacing="0.08em"
      >
        © {new Date().getFullYear()} · Built for language learners, not advertisers.
      </div>
    </div>

    <div class="flex items-center justify-center" style:padding="40px">
      <div
        class="w-full max-w-[400px] rounded-[16px]"
        style:padding="32px"
        style:background="var(--surface)"
        style:border="1px solid var(--line-2)"
        style:box-shadow="var(--shadow-lg)"
      >
        <a
          href={resolve("/")}
          class="lg:hidden flex items-center gap-2.5 mb-6 justify-center"
        >
          <div
            class="w-7 h-7 rounded-[6px] grid place-items-center text-white"
            style:background="var(--brand)"
          >
            <Play class="h-3.5 w-3.5 fill-current" />
          </div>
          <span class="font-display font-extrabold text-lg">Notflix</span>
        </a>

        <div
          class="flex gap-1 p-1 rounded-[10px] mb-6"
          style:background="var(--bg)"
        >
          <button
            class="flex-1 rounded-[7px] font-semibold text-[13px]"
            style:padding="8px 0"
            style:background="var(--surface-2)"
            style:color="var(--fg)"
          >
            Sign in
          </button>
          <a
            href={resolve("/register")}
            class="flex-1 rounded-[7px] font-semibold text-[13px] text-center transition-colors hover:bg-white/[0.03]"
            style:padding="8px 0"
            style:color="var(--fg-2)"
          >
            Create account
          </a>
        </div>

        <h2
          class="font-display font-bold mb-1.5"
          style:font-size="22px"
          style:letter-spacing="-0.02em"
        >
          Welcome back
        </h2>
        <p class="text-[13px] mb-5" style:color="var(--fg-2)">
          Continue where you paused.
        </p>

        <form onsubmit={handleLogin} novalidate class="flex flex-col gap-3.5">
          {#if errorMessage}
            <div
              class="p-3 text-sm rounded-md"
              style:background="rgba(239,68,68,0.10)"
              style:border="1px solid rgba(239,68,68,0.30)"
              style:color="var(--hard)"
            >
              {errorMessage}
            </div>
          {/if}

          <div>
            <label
              for="email"
              class="text-[12px] font-medium mb-1.5 block"
              style:color="var(--fg-2)">Email</label
            >
            <input
              type="email"
              id="email"
              name="email"
              bind:value={email}
              placeholder="you@domain.com"
              class="w-full rounded-[8px] outline-none transition-all"
              style:padding="10px 14px"
              style:background="rgba(0,0,0,0.30)"
              style:border={fieldErrors.email
                ? "1px solid var(--hard)"
                : "1px solid var(--line-2)"}
              style:color="var(--fg)"
              style:font-size="14px"
            />
            {#if fieldErrors.email}
              <p class="text-xs mt-1" style:color="var(--hard)">
                {fieldErrors.email}
              </p>
            {/if}
          </div>

          <div>
            <label
              for="password"
              class="text-[12px] font-medium mb-1.5 block"
              style:color="var(--fg-2)">Password</label
            >
            <input
              type="password"
              id="password"
              name="password"
              bind:value={password}
              placeholder="••••••••"
              class="w-full rounded-[8px] outline-none transition-all"
              style:padding="10px 14px"
              style:background="rgba(0,0,0,0.30)"
              style:border={fieldErrors.password
                ? "1px solid var(--hard)"
                : "1px solid var(--line-2)"}
              style:color="var(--fg)"
              style:font-size="14px"
            />
            {#if fieldErrors.password}
              <p class="text-xs mt-1" style:color="var(--hard)">
                {fieldErrors.password}
              </p>
            {/if}
          </div>

          <button
            type="submit"
            class="nx-btn nx-btn-brand justify-center mt-2"
            style:padding="12px 0"
            style:font-size="14px"
            disabled={isLoading}
          >
            {#if isLoading}
              Signing in…
            {:else}
              Sign in <ArrowRight class="h-4 w-4" />
            {/if}
          </button>
        </form>

        <div class="flex items-center gap-3 my-5">
          <div class="flex-1 h-px" style:background="var(--line)"></div>
          <span
            class="font-mono uppercase"
            style:font-size="10px"
            style:color="var(--fg-3)"
            style:letter-spacing="0.14em">or</span
          >
          <div class="flex-1 h-px" style:background="var(--line)"></div>
        </div>

        <button
          type="button"
          class="nx-btn nx-btn-outline w-full justify-center"
          style:padding="10px 0"
          style:font-size="13px"
          onclick={handleDemoLogin}
          disabled={isLoading}
        >
          <Sparkles class="h-3.5 w-3.5" /> Try demo library
        </button>

        <p
          class="text-center mt-5 mb-0"
          style:font-size="12px"
          style:color="var(--fg-3)"
        >
          No account?
          <a
            href={resolve("/register")}
            style:color="var(--brand-hi)"
            class="hover:underline"
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  </div>
</div>
