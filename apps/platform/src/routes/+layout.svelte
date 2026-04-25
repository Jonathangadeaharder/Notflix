<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve */
  import "../app.css";
  import { onMount } from "svelte";
  import favicon from "$lib/assets/favicon.svg";
  import Play from "lucide-svelte/icons/play";
  import Search from "lucide-svelte/icons/search";
  import Home from "lucide-svelte/icons/home";
  import Library from "lucide-svelte/icons/library";
  import BookOpen from "lucide-svelte/icons/book-open";
  import Menu from "lucide-svelte/icons/menu";
  import X from "lucide-svelte/icons/x";
  import LogOut from "lucide-svelte/icons/log-out";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import { signOut } from "$lib/auth-client";

  let { children } = $props();
  let mobileMenuOpen = $state(false);
  const AVATAR_GRADIENT =
    "linear-gradient(135deg, var(--brand-hi), var(--brand))";

  const navItems = [
    { key: "home", label: "Home", icon: Home, href: "/" },
    { key: "studio", label: "Studio", icon: Library, href: "/studio" },
    { key: "vocab", label: "Vocabulary", icon: BookOpen, href: "/vocabulary" },
  ];

  const currentKey = $derived.by(() => {
    const path = $page.url.pathname.replace(base, "");
    if (path.startsWith("/studio")) return "studio";
    if (path.startsWith("/vocabulary")) return "vocab";
    if (path.startsWith("/profile")) return "profile";
    if (path.startsWith("/watch")) return "home";
    return "home";
  });

  const isAuthRoute = $derived.by(() => {
    const path = $page.url.pathname.replace(base, "");
    return path.startsWith("/login") || path.startsWith("/register");
  });

  onMount(() => {
    document.documentElement.dataset.hydrated = "true";
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div
  class="min-h-screen flex flex-col"
  style:background="var(--bg)"
  style:color="var(--fg)"
>
  {#if !isAuthRoute}
    <nav
      class="sticky top-0 z-50 transition-all duration-300"
      style:background="rgba(0, 0, 0, 0.55)"
      style:backdrop-filter="blur(14px) saturate(1.2)"
      style:-webkit-backdrop-filter="blur(14px) saturate(1.2)"
      style:border-bottom="1px solid var(--line)"
    >
      <div class="px-7 h-[60px] flex items-center gap-6">
        <!-- Brand mark -->
        <a href="{base}/" class="flex items-center gap-2.5 group">
          <div
            class="w-[26px] h-[26px] rounded-md grid place-items-center text-white transition-transform group-hover:rotate-[-6deg]"
            style:background="var(--brand)"
          >
            <Play class="h-3.5 w-3.5 fill-current" />
          </div>
          <span
            class="font-bold text-[17px] tracking-tight font-display"
            style:letter-spacing="-0.03em"
          >
            Notflix
          </span>
        </a>

        <!-- Primary nav -->
        <div class="hidden md:flex items-center gap-0.5 ml-3">
          {#each navItems as item (item.key)}
            <a
              href="{base}{item.href}"
              class="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all"
              style:color={currentKey === item.key
                ? "var(--fg)"
                : "var(--fg-2)"}
              style:background={currentKey === item.key
                ? "rgba(255,255,255,0.06)"
                : "transparent"}
            >
              <item.icon class="h-4 w-4" />
              {item.label}
            </a>
          {/each}
        </div>

        <!-- Right cluster -->
        <div class="ml-auto hidden md:flex items-center gap-4">
          <button
            class="w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-white/5"
            style:color="var(--fg-2)"
            aria-label="Search library"
            disabled
            title="Search coming soon"
          >
            <Search class="h-4 w-4" />
          </button>
          <span class="chip" style:padding="3px 8px" style:font-size="10px">
            <span style:color="var(--fg-3)">ES</span>
            <span style:color="var(--fg-2)">→</span>
            <span style:color="var(--fg)">EN</span>
          </span>
          <a
            href="{base}/profile"
            class="w-8 h-8 rounded-full grid place-items-center text-white"
            style:background={AVATAR_GRADIENT}
            aria-label="Open profile"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
          </a>
          <button
            data-testid="logout-btn"
            class="w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-white/5"
            style:color="var(--fg-3)"
            aria-label="Sign out"
            onclick={async () => {
              const { error } = await signOut();
              if (error) console.error("Logout failed:", error);
            }}
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>

        <!-- Mobile toggle -->
        <button
          class="md:hidden ml-auto p-2 rounded-md hover:bg-white/5"
          style:color="var(--fg-2)"
          onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {#if mobileMenuOpen}
            <X class="h-5 w-5" />
          {:else}
            <Menu class="h-5 w-5" />
          {/if}
        </button>
      </div>

      {#if mobileMenuOpen}
        <div
          class="md:hidden border-t"
          style:border-color="var(--line)"
          style:background="rgba(0,0,0,0.85)"
          style:backdrop-filter="blur(14px)"
        >
          <div class="px-4 py-3 space-y-1">
            {#each navItems as item (item.key)}
              <a
                href="{base}{item.href}"
                class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all"
                style:color={currentKey === item.key
                  ? "var(--fg)"
                  : "var(--fg-2)"}
                style:background={currentKey === item.key
                  ? "rgba(255,255,255,0.06)"
                  : "transparent"}
                onclick={() => (mobileMenuOpen = false)}
              >
                <item.icon class="h-5 w-5" />
                {item.label}
              </a>
            {/each}
            <a
              href="{base}/profile"
              class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all"
              style:color="var(--fg-2)"
              onclick={() => (mobileMenuOpen = false)}
            >
              Profile
            </a>
            <button
              data-testid="logout-btn-mobile"
              class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium w-full text-left transition-all hover:bg-white/5"
              style:color="var(--fg-2)"
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
  {/if}

  <main class="relative z-0 flex-1">
    {@render children()}
  </main>

  {#if !isAuthRoute}
    <footer
      class="mt-auto"
      style:background="rgba(0,0,0,0.30)"
      style:border-top="1px solid var(--line)"
    >
      <div class="max-w-7xl mx-auto px-6 py-8">
        <div
          class="font-mono text-[11px] flex items-center justify-between flex-wrap gap-3"
          style:color="var(--fg-3)"
          style:letter-spacing="0.08em"
        >
          <span
            >© {new Date().getFullYear()} · Built for language learners, not advertisers.</span
          >
          <span class="flex items-center gap-4">
            <span>Local-first</span>
            <span>·</span>
            <span>Open beta</span>
          </span>
        </div>
      </div>
    </footer>
  {/if}
</div>
