<script lang="ts">
  import { resolve } from "$app/paths";
  import Play from "lucide-svelte/icons/play";
  import Info from "lucide-svelte/icons/info";
  import Plus from "lucide-svelte/icons/plus";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import ComprehensionRing from "$lib/components/brand/ComprehensionRing.svelte";
  import Poster from "$lib/components/brand/Poster.svelte";
  import Chip from "$lib/components/brand/Chip.svelte";
  import RailHeader from "$lib/components/brand/RailHeader.svelte";
  import type { DashboardVideo } from "$lib/server/services/dashboard-metrics";
  import type {
    KnowledgeGapStats,
    ReadyLemma,
  } from "$lib/server/services/knowledge-stats.service";

  let { data } = $props<{
    data: {
      featuredVideo: DashboardVideo | null;
      continueWatching: DashboardVideo | null;
      videos: DashboardVideo[];
      knowledgeGap: KnowledgeGapStats;
    };
  }>();

  const HASH_PRIME = 31;
  const HUE_MAX = 360;
  const SECONDS_PER_MIN = 60;
  const SECONDS_PER_HOUR = 3600;
  const PAD_WIDTH = 2;
  const VARIANT_MODULO = 3;
  const KEEP_GOING_LIMIT = 4;
  const FRESH_LIMIT = 5;
  const DEFAULT_HUE = 18;
  const DEFAULT_COMPREHENSION = 92;
  const PERCENT_FULL = 100;
  const BAR_HEIGHT_PX = 56;
  const BAR_BORDER_PX = 4;
  const RING_SIZE = 34;
  const RING_STROKE = 2.5;
  const OVERLAY_GRADIENT =
    "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85))";
  const HERO_RADIAL =
    "radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.10), transparent 55%)";
  const HERO_FADE =
    "linear-gradient(180deg, transparent 0%, transparent 50%, var(--bg) 100%)";
  const WATCH_ROUTE = "/watch/[id]";
  const TREND_BAR_MAX_PX = 80;

  function hueOf(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++)
      h = (h * HASH_PRIME + id.charCodeAt(i)) >>> 0;
    return h % HUE_MAX;
  }

  function fmtTimeRemaining(v: DashboardVideo): string {
    const totalMin = Math.max(
      1,
      Math.round((v.watchDuration || 0) / SECONDS_PER_MIN),
    );
    const watchedMin = Math.round((v.watchSeconds || 0) / SECONDS_PER_MIN);
    const remaining = Math.max(0, totalMin - watchedMin);
    return remaining > 0 ? `${remaining}m left` : `${totalMin}m`;
  }

  function fmtTimestamp(s: number): string {
    const total = Math.max(0, Math.floor(s));
    const h = Math.floor(total / SECONDS_PER_HOUR);
    const m = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MIN);
    const sec = total % SECONDS_PER_MIN;
    return [h, m, sec]
      .map((n) => n.toString().padStart(PAD_WIDTH, "0"))
      .join(":");
  }

  function isReady(v: DashboardVideo): boolean {
    return v.status === "COMPLETED" || v.status === "completed";
  }

  function variantFor(v: DashboardVideo, i: number): "art" | "placeholder" {
    return (hueOf(v.id) + i) % VARIANT_MODULO === 0 ? "art" : "placeholder";
  }

  const featured = $derived(data.featuredVideo ?? data.videos[0] ?? null);
  const featuredHue = $derived(featured ? hueOf(featured.id) : DEFAULT_HUE);
  const featuredComp = $derived(
    featured?.comprehensionPercent ?? DEFAULT_COMPREHENSION,
  );

  const keepGoing = $derived(
    data.videos
      .filter(
        (v: DashboardVideo) =>
          v.watchPercent > 0 && v.watchPercent < PERCENT_FULL && isReady(v),
      )
      .slice(0, KEEP_GOING_LIMIT),
  );
  const fresh = $derived(
    data.videos
      .filter((v: DashboardVideo) => v.watchPercent === 0 && isReady(v))
      .slice(0, FRESH_LIMIT),
  );
  const showRailFallback = $derived(
    keepGoing.length === 0 && fresh.length === 0,
  );

  const lemmaTrend = $derived(
    data.knowledgeGap?.trend?.map((p: { count: number }) => p.count) || [],
  );
  const todaysLemmas = $derived<ReadyLemma[]>(
    data.knowledgeGap?.readyLemmas || [],
  );
  const knownCount = $derived(data.knowledgeGap?.knownCount || 0);
  const trendMax = $derived(Math.max(...lemmaTrend, 1));
</script>

<svelte:head>
  <title>Notflix · Cinema for language learners</title>
</svelte:head>

<div class="relative min-h-[calc(100vh-60px)]" style:background="var(--bg)">
  {#if featured}
    <!-- ──────────────────────────────────────────────────────────────────
         Hero band — gradient + glow + paused-at card + CTAs
         ────────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden" style:height="520px">
      <div
        class="absolute inset-0"
        style:background={`linear-gradient(155deg, oklch(0.34 0.14 ${featuredHue}) 0%, oklch(0.16 0.08 ${featuredHue}) 60%, var(--bg) 100%)`}
      ></div>
      <div class="absolute inset-0" style:background={HERO_RADIAL}></div>
      <div class="absolute inset-0" style:background={HERO_FADE}></div>

      <div class="relative z-[2] px-6 lg:px-[60px] pt-20 max-w-[720px]">
        <div class="flex items-center gap-2.5 mb-5">
          {#if data.continueWatching && featured?.id === data.continueWatching.id}
            <Chip variant="brand">Continue watching</Chip>
            <span
              class="font-mono text-[11px] uppercase"
              style:color="var(--fg-2)"
              style:letter-spacing="0.08em"
            >
              {fmtTimeRemaining(featured)}
            </span>
          {:else}
            <Chip variant="brand">Featured tonight</Chip>
            <span
              class="font-mono text-[11px] uppercase"
              style:color="var(--fg-2)"
              style:letter-spacing="0.08em"
            >
              Curated for B1 Spanish
            </span>
          {/if}
        </div>

        <h1
          class="font-display"
          style:font-size="clamp(44px, 6vw, 68px)"
          style:font-weight="800"
          style:letter-spacing="-0.035em"
          style:line-height="0.95"
          style:margin="0"
        >
          {featured.title}
        </h1>

        <p
          class="text-[17px] leading-[1.55] mt-5 max-w-[520px]"
          style:color="var(--fg-2)"
        >
          A subtitled journey through {featured.targetLang?.toUpperCase() ||
            "Spanish"} cinema — Notflix tracks every word you know and quietly fills
          the gaps.
        </p>

        <!-- Comprehension card -->
        <div
          class="flex items-center gap-7 mt-7 max-w-[560px] rounded-[14px]"
          style:padding="16px 20px"
          style:background="rgba(0,0,0,0.40)"
          style:backdrop-filter="blur(10px)"
          style:border="1px solid var(--line)"
        >
          <ComprehensionRing
            value={featuredComp}
            size={BAR_HEIGHT_PX}
            stroke={BAR_BORDER_PX}
            pulse
          />
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <div
              class="font-mono text-[10px] uppercase"
              style:color="var(--fg-3)"
              style:letter-spacing="0.1em"
            >
              Comprehension estimate
            </div>
            <div class="text-[15px]" style:color="var(--fg)">
              <strong>{Math.round(featuredComp)}%</strong> of words are already known
            </div>
            <div class="text-xs" style:color="var(--fg-2)">
              · {featured.targetLang?.toUpperCase() || "ES"} → EN ·
              {data.continueWatching
                ? "Resume where you paused"
                : "Ready to play"}
            </div>
          </div>
          <div
            style:width="1px"
            style:height="40px"
            style:background="var(--line-2)"
          ></div>
          <div class="hidden sm:block">
            <div
              class="font-mono text-[10px] uppercase"
              style:color="var(--fg-3)"
              style:letter-spacing="0.1em"
            >
              {data.continueWatching ? "Paused at" : "Runtime"}
            </div>
            <div class="font-mono text-xl font-semibold mt-0.5">
              {fmtTimestamp(
                featured.watchSeconds || featured.watchDuration || 0,
              )}
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-7 flex-wrap">
          <a
            href={resolve(WATCH_ROUTE, { id: featured.id })}
            class="nx-btn nx-btn-primary"
          >
            <Play class="h-4 w-4 fill-current" />
            {data.continueWatching ? "Resume watching" : "Start watching"}
          </a>
          <button class="nx-btn nx-btn-ghost" disabled title="Coming soon">
            <Info class="h-4 w-4" />
            Episode details
          </button>
          <button
            class="nx-btn nx-btn-ghost"
            style:padding="10px 14px"
            aria-label="Add to watchlist"
            disabled
            title="Coming soon"
          >
            <Plus class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Corner poster -->
      <div
        class="hidden lg:block absolute right-[60px] top-[120px] w-[240px] h-[340px] rounded-xl overflow-hidden z-[2]"
        style:box-shadow="var(--shadow-lg)"
        style:border="1px solid var(--line)"
      >
        <Poster
          title={featured.title}
          id={featured.id}
          hue={featuredHue}
          variant="art"
        />
      </div>
    </section>

    <!-- ──────────────────────────────────────────────────────────────────
         Keep going rail
         ────────────────────────────────────────────────────────────────── -->
    {#if keepGoing.length > 0}
      <section class="px-6 lg:px-[60px] pb-10">
        <RailHeader title="Keep going" subtitle="Resume where you left off" />
        <div
          class="grid gap-4"
          style:grid-template-columns="repeat(auto-fill, minmax(260px, 1fr))"
        >
          {#each keepGoing as v, i (v.id)}
            <a
              href={resolve(WATCH_ROUTE, { id: v.id })}
              class="group block rounded-xl overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5"
              style:border="1px solid var(--line)"
              style:background="var(--surface)"
            >
              <div class="relative aspect-video">
                <Poster
                  title={v.title}
                  id={v.id}
                  hue={hueOf(v.id)}
                  variant={variantFor(v, i)}
                />
                <div
                  class="absolute inset-0"
                  style:background={OVERLAY_GRADIENT}
                ></div>
                <div class="absolute left-3.5 right-3.5 bottom-2.5">
                  <div
                    class="font-bold text-[15px]"
                    style:letter-spacing="-0.01em"
                  >
                    {v.title}
                  </div>
                  <div class="text-[11px] mt-0.5" style:color="var(--fg-2)">
                    {v.targetLang?.toUpperCase() || "ES"} · {fmtTimeRemaining(
                      v,
                    )}
                  </div>
                </div>
                <div class="absolute top-2.5 right-2.5">
                  <ComprehensionRing
                    value={v.comprehensionPercent ?? 0}
                    size={RING_SIZE}
                    stroke={RING_STROKE}
                  />
                </div>
                <!-- progress bar -->
                <div
                  class="absolute bottom-0 left-0 right-0"
                  style:height="3px"
                  style:background="rgba(255,255,255,0.12)"
                >
                  <div
                    class="h-full"
                    style:background="var(--brand-hi)"
                    style:width="{v.watchPercent}%"
                  ></div>
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ──────────────────────────────────────────────────────────────────
         Curated for your level (cozy 5/row)
         ────────────────────────────────────────────────────────────────── -->
    {#if fresh.length > 0}
      <section class="px-6 lg:px-[60px] pb-14">
        <RailHeader
          title="Curated for your level"
          subtitle={`${featured.targetLang?.toUpperCase() || "ES"} · gap-filled selections`}
        />
        <div
          class="grid gap-3.5"
          style:grid-template-columns="repeat(auto-fill, minmax(180px, 1fr))"
        >
          {#each fresh as v, i (v.id)}
            <a
              href={resolve(WATCH_ROUTE, { id: v.id })}
              class="block group cursor-pointer"
            >
              <div
                class="relative rounded-[10px] overflow-hidden aspect-[2/3] transition-transform group-hover:-translate-y-0.5"
                style:border="1px solid var(--line)"
                style:background="var(--surface)"
              >
                <Poster
                  title={v.title}
                  id={v.id}
                  hue={hueOf(v.id)}
                  variant={variantFor(v, i)}
                />
                {#if v.comprehensionPercent !== null}
                  <div class="absolute top-2 left-2">
                    <span
                      class="chip learn"
                      style:padding="3px 7px"
                      style:font-size="9px"
                    >
                      {Math.round(v.comprehensionPercent)}% comp
                    </span>
                  </div>
                {/if}
              </div>
              <div class="mt-2.5">
                <div class="text-[13px] font-semibold truncate">{v.title}</div>
                <div class="text-[11px] mt-0.5" style:color="var(--fg-3)">
                  {v.targetLang?.toUpperCase() || "ES"} · {v.views}
                  {v.views === 1 ? "view" : "views"}
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    {#if showRailFallback}
      <section class="px-6 lg:px-[60px] pb-14">
        <div
          class="rounded-[14px] p-10 text-center"
          style:background="var(--surface)"
          style:border="1px solid var(--line)"
        >
          <div
            class="font-mono text-[10px] uppercase mb-3"
            style:color="var(--fg-3)"
            style:letter-spacing="0.12em"
          >
            Your library is empty
          </div>
          <div class="font-display text-2xl font-bold mb-2">
            Upload a video to begin
          </div>
          <p class="text-sm mb-5" style:color="var(--fg-2)">
            Notflix transcribes, analyzes, and translates the words you don't
            know — locally.
          </p>
          <a href={resolve("/studio/upload")} class="nx-btn nx-btn-brand">
            Upload first video <ArrowRight class="h-4 w-4" />
          </a>
        </div>
      </section>
    {/if}

    <!-- ──────────────────────────────────────────────────────────────────
         Knowledge gap panel
         ────────────────────────────────────────────────────────────────── -->
    {#if todaysLemmas.length > 0 || lemmaTrend.length > 0}
      <section class="px-6 lg:px-[60px] pb-20">
        <RailHeader
          title="Your knowledge gap · this week"
          subtitle={`${todaysLemmas.filter((l) => l.state === "learn").length} learning · ${todaysLemmas.filter((l) => l.state === "hard").length} hard`}
        />
        <div class="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <div
            class="rounded-[14px] p-6"
            style:background="var(--surface)"
            style:border="1px solid var(--line)"
          >
            <div
              class="font-mono text-[10px] uppercase"
              style:color="var(--fg-3)"
              style:letter-spacing="0.12em"
            >
              Videos processed · last 14 days
            </div>
            {#if lemmaTrend.length > 0}
              <div class="flex items-end gap-1 mt-4" style:height="90px">
                {#each lemmaTrend as v, i (i)}
                  <div
                    class="flex-1 rounded-[2px]"
                    style:height="{(v / trendMax) * TREND_BAR_MAX_PX}px"
                    style:min-height="3px"
                    style:background={i === lemmaTrend.length - 1
                      ? "var(--brand-hi)"
                      : "var(--surface-2)"}
                  ></div>
                {/each}
              </div>
              <div class="flex justify-between mt-3.5">
                <span class="font-mono text-[10px]" style:color="var(--fg-3)"
                  >14d ago</span
                >
                <span class="font-mono text-[10px]" style:color="var(--fg-3)"
                  >today</span
                >
              </div>
            {:else}
              <div class="mt-4 text-sm" style:color="var(--fg-3)">
                No processing activity yet — upload a video to start tracking.
              </div>
            {/if}
          </div>

          <div
            class="rounded-[14px] p-6 flex flex-col gap-3.5"
            style:background="var(--surface)"
            style:border="1px solid var(--line)"
          >
            <div
              class="font-mono text-[10px] uppercase"
              style:color="var(--fg-3)"
              style:letter-spacing="0.12em"
            >
              Today's ready lemmas
            </div>
            {#if todaysLemmas.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each todaysLemmas as l (l.word)}
                  <Chip
                    variant={l.state === "hard" ? "hard" : "learn"}
                    class="!normal-case !text-xs"
                  >
                    <span style:font-family="var(--font-sans)">{l.word}</span>
                  </Chip>
                {/each}
              </div>
            {:else}
              <div class="text-sm" style:color="var(--fg-3)">
                No new lemmas to review yet.
              </div>
            {/if}
            <div class="mt-auto flex justify-between items-center">
              <span class="text-xs" style:color="var(--fg-2)">
                <strong style:color="var(--fg)">{knownCount}</strong> known ·
                <strong style:color="var(--learn-hi)"
                  >{todaysLemmas.length}</strong
                > ready
              </span>
              <a
                href={resolve("/vocabulary")}
                class="nx-btn nx-btn-ghost"
                style:padding="6px 12px"
                style:font-size="12px"
              >
                Review <ArrowRight class="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
    {/if}
  {:else}
    <!-- Empty library state -->
    <section
      class="min-h-[calc(100vh-60px)] flex items-center justify-center px-6 atmo-grid"
    >
      <div class="absolute inset-0 atmo-glow pointer-events-none"></div>
      <div class="relative z-10 max-w-[520px] text-center">
        <Chip variant="brand">Welcome to Notflix</Chip>
        <h1
          class="font-display mt-5 mb-4"
          style:font-size="48px"
          style:font-weight="800"
          style:letter-spacing="-0.03em"
          style:line-height="1.05"
        >
          Your library is empty —<br />
          let's begin.
        </h1>
        <p class="text-base mb-7" style:color="var(--fg-2)">
          Upload a video in any language and Notflix will transcribe it, find
          your word gaps, and turn them into flashcards.
        </p>
        <a href={resolve("/studio/upload")} class="nx-btn nx-btn-brand">
          Upload first video <ArrowRight class="h-4 w-4" />
        </a>
      </div>
    </section>
  {/if}
</div>
