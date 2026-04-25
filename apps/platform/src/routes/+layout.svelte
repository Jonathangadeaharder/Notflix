<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve */
  import "../app.css";
  import { onMount } from "svelte";
  import favicon from "$lib/assets/favicon.svg";
  import Clapperboard from "lucide-svelte/icons/clapperboard";
  import User from "lucide-svelte/icons/user";
  import LayoutGrid from "lucide-svelte/icons/layout-grid";
  import BookOpen from "lucide-svelte/icons/book-open";
  import LogOut from "lucide-svelte/icons/log-out";
  import { base } from "$app/paths";
  import { signOut } from "$lib/auth-client";

  let { children } = $props();

  let mobileMenuOpen = $state(false);

  onMount(() => {
    document.documentElement.dataset.hydrated = "true";
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div
  class="min-h-screen bg-neutral-950 text-white font-sans selection:bg-magenta-900 selection:text-white"
>
  <nav
    class="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-8">
          <a href="{base}/" class="flex items-center gap-2 group">
            <div
              class="bg-magenta-600 p-1 rounded transform group-hover:rotate-12 transition-transform duration-300"
            >
              <Clapperboard class="h-6 w-6 text-white fill-current" />
            </div>
            <span
              class="text-white font-bold text-xl tracking-tight group-hover:text-magenta-500 transition-colors"
              >NOTFLIX</span
            >
          </a>
          <div class="hidden md:flex items-center space-x-1">
            <a
              href="{base}/studio"
              class="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-full text-sm font-medium transition-all"
            >
              <LayoutGrid class="h-4 w-4" />
              Studio
            </a>
            <a
              href="{base}/vocabulary"
              class="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-full text-sm font-medium transition-all"
            >
              <BookOpen class="h-4 w-4" />
              Vocabulary
            </a>
            <a
              href="{base}/profile"
              class="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-full text-sm font-medium transition-all"
            >
              <User class="h-4 w-4" />
              Profile
            </a>
            <button
              data-testid="logout-btn"
              class="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
              onclick={async () => {
                const { error } = await signOut();
                if (error) console.error("Logout failed:", error);
              }}
            >
              <LogOut class="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>

        <!-- Mobile menu button -->
        <div class="md:hidden">
          <button
            class="text-zinc-400 hover:text-white p-2 rounded-md"
            onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {#if mobileMenuOpen}
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            {:else}
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu panel -->
    {#if mobileMenuOpen}
      <div
        class="md:hidden border-t border-white/5 bg-black/80 backdrop-blur-xl"
      >
        <div class="px-4 py-3 space-y-1">
          <a
            href="{base}/studio"
            class="flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 px-3 py-3 rounded-lg text-sm font-medium transition-all"
            onclick={() => (mobileMenuOpen = false)}
          >
            <LayoutGrid class="h-5 w-5" />
            Studio
          </a>
          <a
            href="{base}/vocabulary"
            class="flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 px-3 py-3 rounded-lg text-sm font-medium transition-all"
            onclick={() => (mobileMenuOpen = false)}
          >
            <BookOpen class="h-5 w-5" />
            Vocabulary
          </a>
          <a
            href="{base}/profile"
            class="flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 px-3 py-3 rounded-lg text-sm font-medium transition-all"
            onclick={() => (mobileMenuOpen = false)}
          >
            <User class="h-5 w-5" />
            Profile
          </a>
          <button
            data-testid="logout-btn-mobile"
            class="flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 px-3 py-3 rounded-lg text-sm font-medium transition-all w-full text-left cursor-pointer"
            onclick={async () => {
              mobileMenuOpen = false;
              const { error } = await signOut();
              if (error) console.error("Logout failed:", error);
            }}
          >
            <LogOut class="h-5 w-5" />
            Log Out
          </button>
        </div>
      </div>
    {/if}
  </nav>

  <main class="relative z-0">
    {@render children()}
  </main>

  <footer class="border-t border-white/5 bg-black/30 backdrop-blur-sm mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Brand -->
        <div>
          <a href="{base}/" class="flex items-center gap-2 group mb-3">
            <div class="bg-magenta-600 p-1 rounded">
              <Clapperboard class="h-5 w-5 text-white fill-current" />
            </div>
            <span class="text-white font-bold text-lg tracking-tight"
              >NOTFLIX</span
            >
          </a>
          <p class="text-zinc-500 text-sm leading-relaxed">
            AI-powered language learning through immersive video content.
            Upload, transcribe, translate, and learn — all locally.
          </p>
        </div>

        <!-- Navigation -->
        <div>
          <h4
            class="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3"
          >
            Navigate
          </h4>
          <ul class="space-y-2 text-sm">
            <li>
              <a
                href="{base}/studio"
                class="text-zinc-500 hover:text-white transition-colors"
                >Studio</a
              >
            </li>
            <li>
              <a
                href="{base}/vocabulary"
                class="text-zinc-500 hover:text-white transition-colors"
                >Vocabulary</a
              >
            </li>
            <li>
              <a
                href="{base}/profile"
                class="text-zinc-500 hover:text-white transition-colors"
                >Profile</a
              >
            </li>
          </ul>
        </div>

        <!-- Info -->
        <div>
          <h4
            class="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3"
          >
            About
          </h4>
          <ul class="space-y-2 text-sm">
            <li><span class="text-zinc-500">100% local & private</span></li>
            <li><span class="text-zinc-500">Zero cloud dependencies</span></li>
            <li>
              <a
                href="{base}/debug"
                class="text-zinc-500 hover:text-white transition-colors"
                >Debug Tools</a
              >
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-8 pt-6 border-t border-white/5 text-center">
        <p class="text-zinc-600 text-xs">
          &copy; {new Date().getFullYear()} Notflix. Built for language learners,
          by language learners.
        </p>
      </div>
    </div>
  </footer>
</div>
