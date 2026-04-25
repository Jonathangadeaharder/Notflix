<script lang="ts">
  import Search from "lucide-svelte/icons/search";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  import BookOpen from "lucide-svelte/icons/book-open";
  import Download from "lucide-svelte/icons/download";
  import Sparkles from "lucide-svelte/icons/sparkles";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";
  import { SvelteSet } from "svelte/reactivity";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let searchInput = $state(data.filters.search ?? "");
  const togglingWords = new SvelteSet<string>();

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2", "untracked"] as const;

  // CEFR colour ramp — green for early, gold for middle, brand for advanced
  const levelColors: Record<string, string> = {
    A1: "var(--known)",
    A2: "var(--known)",
    B1: "var(--learn)",
    B2: "var(--learn-hi)",
    C1: "var(--brand-hi)",
    C2: "var(--brand)",
    untracked: "var(--fg-3)",
  };

  const levelLabels: Record<string, string> = {
    A1: "A1 · Beginner",
    A2: "A2 · Elementary",
    B1: "B1 · Intermediate",
    B2: "B2 · Upper int.",
    C1: "C1 · Advanced",
    C2: "C2 · Proficient",
    untracked: "Untracked",
  };

  function setFilter(key: string, value: string | null) {
    const url = new URL($page.url);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    if (key !== "page") {
      url.searchParams.set("page", "1");
    }
    /* eslint-disable-next-line svelte/no-navigation-without-resolve */
    goto(url.toString(), { replaceState: true, invalidateAll: true });
  }

  function handleSearch() {
    setFilter("search", searchInput || null);
  }
  function clearSearch() {
    searchInput = "";
    setFilter("search", null);
  }
  function goToPage(newPage: number) {
    setFilter("page", newPage.toString());
  }

  async function toggleKnown(lemma: string, isKnown: boolean) {
    togglingWords.add(lemma);
    const method = isKnown ? "DELETE" : "POST";
    try {
      const res = await fetch("/api/words/known", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lemma, lang: data.filters.lang }),
      });
      if (res.ok) {
        await invalidateAll();
      }
    } catch (e) {
      console.error("Toggle known error:", e);
    } finally {
      togglingWords.delete(lemma);
    }
  }

  const totalCount = $derived(
    Object.values(data.levelCounts).reduce((a, b) => a + b, 0),
  );
  const knownInPage = $derived(data.words.filter((w) => w.isKnown).length);

  function hashStrength(lemma: string, isKnown: boolean): number {
    if (isKnown) return 0.92;
    let h = 0;
    for (let i = 0; i < lemma.length; i++)
      h = (h * 17 + lemma.charCodeAt(i)) >>> 0;
    return 0.18 + (h % 100) / 250;
  }
</script>

<svelte:head>
  <title>Vocabulary · Notflix</title>
</svelte:head>

<div class="min-h-screen" style:background="var(--bg)">
  <div class="max-w-6xl mx-auto" style:padding="40px 60px">
    <div class="mb-8">
      <div
        class="font-mono uppercase"
        style:font-size="11px"
        style:color="var(--fg-3)"
        style:letter-spacing="0.1em"
      >
        {data.filters.lang?.toUpperCase()} ·
        <span style:color="var(--fg-2)">{totalCount} lemmas tracked</span>
      </div>
      <h1
        class="font-display"
        style:font-size="40px"
        style:font-weight="800"
        style:letter-spacing="-0.035em"
        style:margin="8px 0 6px"
      >
        Your vocabulary
      </h1>
      <p class="text-[15px]" style:color="var(--fg-2)" style:margin="0">
        Lemma-level state. Earn lemmas by watching; export anytime.
      </p>
    </div>

    <!-- Tab row + search + actions -->
    <div
      class="flex items-center gap-1 flex-wrap mb-5"
      style:border-bottom="1px solid var(--line)"
    >
      <button
        class="flex items-center gap-2 transition-colors"
        style:padding="12px 16px"
        style:color={!data.filters.level ? "var(--fg)" : "var(--fg-2)"}
        style:border-bottom={!data.filters.level
          ? "2px solid var(--brand-hi)"
          : "2px solid transparent"}
        style:margin-bottom="-1px"
        style:font-size="14px"
        style:font-weight="500"
        onclick={() => setFilter("level", null)}
      >
        All
        <span class="font-mono text-[11px]" style:color="var(--fg-3)">
          {totalCount}
        </span>
      </button>
      {#each levels as level (level)}
        <button
          class="flex items-center gap-2 transition-colors"
          style:padding="12px 16px"
          style:color={data.filters.level === level
            ? "var(--fg)"
            : "var(--fg-2)"}
          style:border-bottom={data.filters.level === level
            ? "2px solid var(--brand-hi)"
            : "2px solid transparent"}
          style:margin-bottom="-1px"
          style:font-size="14px"
          style:font-weight="500"
          onclick={() => setFilter("level", level)}
        >
          <span
            class="inline-block rounded-full"
            style:width="6px"
            style:height="6px"
            style:background={levelColors[level]}
          ></span>
          {levelLabels[level]}
          <span class="font-mono text-[11px]" style:color="var(--fg-3)">
            {data.levelCounts[level]}
          </span>
        </button>
      {/each}
      <div class="ml-auto flex gap-2 py-2">
        <button
          class="nx-btn nx-btn-ghost"
          style:padding="6px 12px"
          style:font-size="12px"
        >
          <Download class="h-3 w-3" /> Export CSV
        </button>
        <button
          class="nx-btn nx-btn-brand"
          style:padding="6px 12px"
          style:font-size="12px"
        >
          <Sparkles class="h-3 w-3" /> Start review
        </button>
      </div>
    </div>

    <!-- Search bar -->
    <div
      class="rounded-[12px] mb-4"
      style:padding="14px 16px"
      style:background="var(--surface)"
      style:border="1px solid var(--line)"
    >
      <div class="flex gap-2 items-center">
        <div class="relative flex-1">
          <Search
            class="absolute h-4 w-4"
            style="left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-3);"
          />
          <input
            type="text"
            placeholder="Search lemmas…"
            bind:value={searchInput}
            onkeydown={(e: KeyboardEvent) =>
              e.key === "Enter" && handleSearch()}
            class="w-full rounded-[8px] outline-none transition-all"
            style:padding="9px 12px 9px 36px"
            style:background="rgba(0,0,0,0.30)"
            style:border="1px solid var(--line-2)"
            style:color="var(--fg)"
            style:font-size="13px"
          />
        </div>
        <button
          class="nx-btn nx-btn-brand"
          style:padding="9px 16px"
          style:font-size="13px"
          onclick={handleSearch}
        >
          Search
        </button>
        {#if data.filters.search}
          <button
            class="nx-btn nx-btn-outline"
            style:padding="9px 14px"
            style:font-size="13px"
            onclick={clearSearch}
          >
            Clear
          </button>
        {/if}
      </div>
    </div>

    <!-- Table -->
    <div
      class="rounded-[12px] overflow-hidden"
      style:background="var(--surface)"
      style:border="1px solid var(--line)"
    >
      <!-- Header row -->
      <div
        class="hidden md:grid font-mono uppercase"
        style:grid-template-columns="2fr 1fr 1fr 1fr 100px"
        style:padding="12px 20px"
        style:border-bottom="1px solid var(--line)"
        style:font-size="10px"
        style:color="var(--fg-3)"
        style:letter-spacing="0.1em"
      >
        <span>Lemma</span>
        <span>Level</span>
        <span>State</span>
        <span>Strength</span>
        <span class="text-right">Action</span>
      </div>

      {#if data.words.length === 0}
        <div
          class="flex flex-col items-center text-center"
          style:padding="60px 20px"
        >
          <div
            class="w-16 h-16 grid place-items-center rounded-full mb-4"
            style:background="var(--surface-2)"
            style:color="var(--fg-3)"
          >
            <BookOpen class="h-7 w-7" />
          </div>
          <div class="font-display font-bold text-xl">No lemmas found</div>
          <p class="text-sm mt-1.5" style:color="var(--fg-2)">
            Try a different filter or watch a video to populate your library.
          </p>
        </div>
      {:else}
        {#each data.words as word, i (word.lemma)}
          {@const levelKey = word.level ?? "untracked"}
          {@const strength = hashStrength(word.lemma, word.isKnown)}
          {@const stateColor = word.isKnown
            ? "var(--known)"
            : "var(--learn-hi)"}
          {@const stateBg = word.isKnown
            ? "rgba(34,197,94,0.10)"
            : "var(--learn-soft)"}
          <div
            class="grid items-center transition-colors hover:bg-white/[0.02]"
            style:grid-template-columns="2fr 1fr 1fr 1fr 100px"
            style:padding="14px 20px"
            style:border-bottom={i < data.words.length - 1
              ? "1px solid var(--line)"
              : "none"}
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="text-[15px] font-semibold truncate"
                style:font-family="var(--font-display)"
                style:letter-spacing="-0.01em">{word.lemma}</span
              >
              {#if word.isProperNoun}
                <span class="chip" style:padding="2px 7px" style:font-size="9px"
                  >Proper noun</span
                >
              {/if}
            </div>

            <div class="flex items-center gap-1.5">
              <span
                class="inline-block rounded-full"
                style:width="6px"
                style:height="6px"
                style:background={levelColors[levelKey]}
              ></span>
              <span
                class="font-mono"
                style:font-size="12px"
                style:color="var(--fg-2)">{word.level ?? "—"}</span
              >
            </div>

            <div>
              <span
                class="chip"
                style:background={stateBg}
                style:color={stateColor}
                style:border-color="transparent"
              >
                {word.isKnown ? "Known" : "Learning"}
              </span>
            </div>

            <div class="w-full max-w-[120px]">
              <div
                class="rounded-full overflow-hidden"
                style:height="3px"
                style:background="rgba(255,255,255,0.10)"
              >
                <div
                  class="h-full rounded-full transition-all"
                  style:width="{strength * 100}%"
                  style:background={stateColor}
                ></div>
              </div>
            </div>

            <div class="text-right">
              <button
                data-testid="toggle-known-{word.lemma}"
                onclick={() => toggleKnown(word.lemma, word.isKnown)}
                disabled={togglingWords.has(word.lemma)}
                aria-pressed={word.isKnown}
                aria-busy={togglingWords.has(word.lemma)}
                aria-label={`Toggle known status for ${word.lemma}`}
                class="text-xs font-medium transition-colors"
                style:color={word.isKnown ? "var(--fg-3)" : "var(--brand-hi)"}
              >
                {#if togglingWords.has(word.lemma)}
                  Saving…
                {:else if word.isKnown}
                  Unmark
                {:else}
                  Mark known
                {/if}
              </button>
            </div>
          </div>
        {/each}
      {/if}

      {#if data.pagination.totalPages > 1}
        <div
          class="flex items-center justify-between"
          style:padding="14px 20px"
          style:border-top="1px solid var(--line)"
        >
          <span
            class="font-mono"
            style:font-size="11px"
            style:color="var(--fg-3)"
          >
            Page {data.pagination.page} / {data.pagination.totalPages} ·
            {data.pagination.total} total
          </span>
          <div class="flex gap-2">
            <button
              class="nx-btn nx-btn-outline"
              style:padding="6px 12px"
              style:font-size="12px"
              disabled={data.pagination.page <= 1}
              onclick={() => goToPage(data.pagination.page - 1)}
            >
              <ChevronLeft class="h-3 w-3" /> Previous
            </button>
            <button
              class="nx-btn nx-btn-outline"
              style:padding="6px 12px"
              style:font-size="12px"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onclick={() => goToPage(data.pagination.page + 1)}
            >
              Next <ChevronRight class="h-3 w-3" />
            </button>
          </div>
        </div>
      {/if}
    </div>

    <p class="text-[12px] text-center mt-6" style:color="var(--fg-3)">
      <span class="font-mono">{knownInPage}</span> known on this page · click "Mark
      known" to graduate a lemma without watching it again.
    </p>
  </div>
</div>
