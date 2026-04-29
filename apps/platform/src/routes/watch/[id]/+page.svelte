<script lang="ts">
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import FileText from "lucide-svelte/icons/file-text";
  import Settings from "lucide-svelte/icons/settings";
  import Sparkles from "lucide-svelte/icons/sparkles";
  import { onMount } from "svelte";
  import { base, resolve } from "$app/paths";
  import { env } from "$env/dynamic/public";
  import Chip from "$lib/components/brand/Chip.svelte";
  import ComprehensionRing from "$lib/components/brand/ComprehensionRing.svelte";
  import type { PlayerSettings, PlayerVideo } from "$lib/components/player/types";
  import VideoPlayer from "$lib/components/player/VideoPlayer.svelte";
  import { GAME } from "$lib/constants";
  import type { E2ETriggerGameInterrupt } from "$lib/e2e-hooks";
  import type { GameCard } from "$lib/types";

  let { data } = $props();

  let gameCards = $state<GameCard[]>([]);
  let currentPlayerProgress = $state({ currentTime: 0, duration: 1, progressPercent: 0 });
  let videoReady = $state(false);
  let playerError = $state<{ code: number; message: string } | null>(null);

  $effect(() => {
    data.video?.id;
    videoReady = false;
    playerError = null;
  });

  function handlePlayerReady() {
    videoReady = true;
  }

  function handlePlayerError(error: { code: number; message: string }) {
    playerError = error;
  }

  const SECONDS_IN_MINUTE = 60;
  const HEATMAP_SEGMENTS = 12;
  const COMP_HIGH = 0.7;
  const COMP_MID = 0.3;
  const PERCENT = 100;
  const COMP_THRESHOLD_85 = 85;
  const COMP_THRESHOLD_65 = 65;
  const RING_SIZE_MD = 64;
  const RING_STROKE_SM = 4;
  const HEAT_START_WEIGHT = 0.42;
  const ID_SLICE_LENGTH = 8;
  const FRAME_GRADIENT =
    "linear-gradient(155deg, oklch(0.22 0.08 18), oklch(0.09 0.04 18))";

  const intervalSeconds = $derived(
    (data.gameInterval || GAME.DEFAULT_INTERVAL_MINUTES) * SECONDS_IN_MINUTE,
  );

  async function handleRequestGameCards(chunkIndex: number, start: number, end: number) {
    const query = new URLSearchParams({
      videoId: data.video?.id || "",
      chunkIndex: chunkIndex.toString(),
      start: start.toString(),
      end: end.toString(),
      targetLang: data.video?.targetLang || "es",
    });

    try {
      const res = await fetch(`${base}/api/game/generate?${query}`);
      if (!res.ok) throw new Error(`Game generation failed`);
      const result = await res.json();
      gameCards = result.cards || [];
    } catch (e) {
      console.error("Game generation failed", e);
      gameCards = [];
    }
  }

  async function handleAnswerSubmitted(answer: {
    lemma: string;
    lang: string;
    isKnown: boolean;
  }) {
    if (answer.isKnown) {
      fetch(`${base}/api/words/known`, {
        method: "POST",
        body: JSON.stringify({
          lemma: answer.lemma,
          lang: answer.lang,
        }),
      }).catch((e) => console.error("Failed to mark known:", e));
    }
  }

  function handleProgressUpdate(progress: { currentTime: number; duration: number; progressPercent: number }) {
    currentPlayerProgress = progress;
  }

  onMount(() => {
    if (typeof window !== "undefined" && env.PUBLIC_PLAYWRIGHT_TEST === "true") {
      (window as any).__e2eTriggerGameInterrupt = ((cards: GameCard[]) => {
        gameCards = cards;
      }) satisfies E2ETriggerGameInterrupt;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__e2eTriggerGameInterrupt;
      }
    };
  });

  // Heatmap and Comprehension Logic
  type HeatmapSegment = { start: number; end: number; type: string };
  type HeatBucket = { easy: number; learn: number; hard: number };
  type HeatLevel = "easy" | "learn" | "hard" | "empty";
  const HEAT_MIN_WEIGHT = 0.1;

  function classifySegmentType(type: string): "easy" | "learn" | "hard" {
    if (type === "EASY") return "easy";
    if (type === "LEARNING") return "learn";
    return "hard";
  }

  function resolveDominantLevel(c: HeatBucket): HeatLevel {
    const max = Math.max(c.easy, c.learn, c.hard);
    if (max === 0) return "empty";
    if (max === c.hard) return "hard";
    if (max === c.learn) return "learn";
    return "easy";
  }

  function buildHeatmapBuckets(heatmap: HeatmapSegment[], totalDuration: number): HeatLevel[] {
    const buckets: HeatLevel[] = Array(HEATMAP_SEGMENTS).fill("empty");
    if (!heatmap || heatmap.length === 0 || totalDuration <= 0) return buckets;
    const bucketSize = totalDuration / HEATMAP_SEGMENTS;
    const counts: HeatBucket[] = Array.from({ length: HEATMAP_SEGMENTS }, () => ({ easy: 0, learn: 0, hard: 0 }));

    for (const seg of heatmap) {
      const startIdx = Math.min(HEATMAP_SEGMENTS - 1, Math.max(0, Math.floor(seg.start / bucketSize)));
      const endIdx = Math.min(HEATMAP_SEGMENTS - 1, Math.max(0, Math.floor(seg.end / bucketSize)));
      const level = classifySegmentType(seg.type);
      for (let b = startIdx; b <= endIdx; b++) {
        const overlap = Math.min(seg.end, (b + 1) * bucketSize) - Math.max(seg.start, b * bucketSize);
        counts[b][level] += Math.max(HEAT_MIN_WEIGHT, overlap);
      }
    }

    return counts.map(resolveDominantLevel);
  }

  const totalDuration = $derived(currentPlayerProgress.duration);
  const heatmapBuckets = $derived(buildHeatmapBuckets(data.heatmap || [], totalDuration));
  const playheadIdx = $derived(Math.min(HEATMAP_SEGMENTS - 1, Math.floor((currentPlayerProgress.currentTime / totalDuration) * HEATMAP_SEGMENTS)));

  const comprehensionEstimate = $derived.by(() => {
    if (!data.heatmap || data.heatmap.length === 0) return 0;
    let easy = 0, learn = 0, hard = 0;
    for (const s of data.heatmap) {
      const w = s.end - s.start;
      if (s.type === "EASY") easy += w;
      else if (s.type === "LEARNING") learn += w;
      else hard += w;
    }
    const total = easy + learn + hard;
    return total === 0 ? 0 : Math.round(((easy * 1 + learn * COMP_HIGH + hard * COMP_MID) / total) * PERCENT);
  });

  const playerSettings = $derived({
    gameInterval: data.gameInterval || GAME.DEFAULT_INTERVAL_MINUTES,
  }) as PlayerSettings;

  const playerVideo = $derived({
    id: data.video?.id,
    title: data.video?.title,
    filePath: data.video?.filePath,
    thumbnailPath: data.video?.thumbnailPath,
    targetLang: data.video?.targetLang,
    duration: data.video?.duration,
  }) as PlayerVideo;
</script>

<svelte:head>
  <title>{data.video?.title || "Watch"} · Notflix</title>
</svelte:head>

<div class="min-h-screen pb-20" style:background="var(--bg)">
  <!-- Header strip -->
  <div
    class="sticky top-0 z-40 flex items-center gap-4 px-6 py-3.5"
    style:border-bottom="1px solid var(--line)"
    style:background="rgba(0,0,0,0.55)"
    style:backdrop-filter="blur(14px)"
  >
    <a
      href={resolve("/studio")}
      class="w-9 h-9 rounded-full grid place-items-center hover:bg-white/5 transition-colors"
      style:color="var(--fg-2)"
      aria-label="Back to studio"
    >
      <ChevronLeft class="h-5 w-5" />
    </a>

    {#if data.video}
      <div class="flex-1 min-w-0">
        <h1 class="font-display font-bold leading-none truncate" style:font-size="18px" style:letter-spacing="-0.025em">
          {data.video.title}
        </h1>
        <p class="text-[11px] mt-1 font-mono uppercase" style:color="var(--fg-3)" style:letter-spacing="0.08em">
          {data.video.targetLang?.toUpperCase() || "ES"} → EN · {data.heatmap?.length || 0} segments
        </p>
      </div>
      <Chip variant="learn" dot>Live transcript</Chip>
    {/if}
  </div>

  <div class="max-w-6xl mx-auto p-4 lg:p-8">
    {#if data.video}
      <div class="relative aspect-video rounded-2xl overflow-hidden" style:border="1px solid var(--line)" style:background={FRAME_GRADIENT} style:box-shadow="0 30px 80px -20px rgba(0,0,0,0.8)">
        {#if playerError}
          <div class="absolute inset-0 flex items-center justify-center z-50" style:background={FRAME_GRADIENT}>
            <div class="text-center p-8">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style:background="rgba(239,68,68,0.1)">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Warning">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-red-400 mb-1">Video failed to load</h3>
              <p class="text-sm mb-6" style:color="var(--fg-3)">{playerError.message}</p>
              <div class="flex items-center justify-center gap-3">
                <a href={resolve("/studio")} class="nx-btn nx-btn-outline">Back to Studio</a>
                <button type="button" class="nx-btn nx-btn-brand" onclick={() => window.location.reload()}>Try again</button>
              </div>
            </div>
          </div>
        {:else}
          {#if !videoReady}
            <div class="absolute inset-0 z-40 flex items-center justify-center" style:background={FRAME_GRADIENT}>
              <div class="spinner"></div>
            </div>
          {/if}

          {#if data.processingStatus && data.processingStatus !== "COMPLETED"}
            <div class="absolute top-0 left-0 right-0 z-30 px-4 py-2.5 text-center text-sm font-medium" style:background="rgba(180,140,40,0.12)" style:color="#d4a017" style:border-bottom="1px solid rgba(180,140,40,0.15)" style:backdrop-filter="blur(8px)">
              <FileText class="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Subtitles are being processed for this video
            </div>
          {/if}

          <VideoPlayer
            video={playerVideo}
            subtitles={data.subtitles}
            settings={playerSettings}
            gameCards={gameCards}
            onRequestGameCards={handleRequestGameCards}
            onProgressUpdate={handleProgressUpdate}
            onAnswerSubmitted={handleAnswerSubmitted}
            onReady={handlePlayerReady}
            onError={handlePlayerError}
          />
        {/if}
      </div>

      <!-- Heatmap -->
      {#if heatmapBuckets.length > 0}
        <div class="mt-5">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-[10px] uppercase" style:color="var(--fg-3)" style:letter-spacing="0.12em">
              Difficulty heatmap · {HEATMAP_SEGMENTS} chapters
            </span>
          </div>
          <div class="relative w-full h-3 flex gap-1">
            {#each heatmapBuckets as bucket, i (i)}
              <div
                class="flex-1 rounded-[2px] transition-opacity"
                class:seg-easy={bucket === "easy"}
                class:seg-learn={bucket === "learn"}
                class:seg-hard={bucket === "hard"}
                class:seg-empty={bucket === "empty"}
                style:opacity={i <= playheadIdx ? 1 : HEAT_START_WEIGHT}
              ></div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Meta Info -->
      <div class="mt-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <div>
          <h2 class="font-display" style:font-size="36px" style:font-weight="800" style:letter-spacing="-0.03em">
            {data.video.title}
          </h2>
          <div class="flex items-center gap-3 text-sm mt-2" style:color="var(--fg-2)">
            <span>{new Date(data.video.createdAt).toLocaleDateString()}</span>
            <span style:color="var(--fg-3)">·</span>
            <span>{data.video.views} views</span>
            <span style:color="var(--fg-3)">·</span>
            <span><Sparkles class="h-3 w-3 inline mr-1" color="var(--learn)" /> Powered by vocabulary</span>
          </div>
          <p class="mt-4 text-[15px] leading-[1.6] max-w-[600px]" style:color="var(--fg-2)">
            Notflix tracks every word you encounter. 
            {#if comprehensionEstimate >= COMP_THRESHOLD_85}
              You're ready for this.
            {:else if comprehensionEstimate >= COMP_THRESHOLD_65}
              Comfortable difficulty.
            {:else}
              Stretch zone.
            {/if}
          </p>
        </div>

        <div class="rounded-[14px] flex items-center gap-5" style:padding="18px 20px" style:background="var(--surface)" style:border="1px solid var(--line)">
          <ComprehensionRing value={comprehensionEstimate} size={RING_SIZE_MD} stroke={RING_STROKE_SM} />
          <div class="flex-1">
            <div class="font-mono text-[10px] uppercase" style:color="var(--fg-3)">Comprehension</div>
            <div class="font-display font-bold mt-1" style:font-size="26px">{comprehensionEstimate}%</div>
          </div>
          <a href={resolve("/profile")} class="nx-btn nx-btn-outline"><Settings class="h-3.5 w-3.5" /></a>
        </div>
      </div>
    {:else}
      <div class="py-32 text-center">
        <h2 class="text-2xl font-bold">Video not found</h2>
        <a href={resolve("/studio")} class="nx-btn nx-btn-brand mt-4">Return to Studio</a>
      </div>
    {/if}
  </div>
</div>

<style>
  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(255, 255, 255, 0.08);
    border-top-color: rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
