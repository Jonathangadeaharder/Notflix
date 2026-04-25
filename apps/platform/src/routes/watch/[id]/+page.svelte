<script lang="ts">
  import GameOverlay from "$lib/components/GameOverlay.svelte";
  import SubtitleDisplay from "$lib/components/player/SubtitleDisplay.svelte";
  import ComprehensionRing from "$lib/components/brand/ComprehensionRing.svelte";
  import Chip from "$lib/components/brand/Chip.svelte";
  import { onMount } from "svelte";
  import { base, resolve } from "$app/paths";
  import ChevronLeft from "lucide-svelte/icons/chevron-left";
  import FileText from "lucide-svelte/icons/file-text";
  import Settings from "lucide-svelte/icons/settings";
  import Sparkles from "lucide-svelte/icons/sparkles";
  import { GAME } from "$lib/constants";
  import type { Subtitle, SubtitleMode } from "$lib/components/player/types";

  type GameCard = {
    lemma: string;
    lang: string;
    original: string;
    contextSentence: string;
    cefr: string;
    translation: string;
    isKnown: boolean;
  };

  type HeatmapSegment = { start: number; end: number; type: string };

  const SECONDS_IN_MINUTE = 60;
  const PLAY_FAILED_MSG = "Play failed:";
  const HEATMAP_SEGMENTS = 12;
  const BINARY_SEARCH_DIVISOR = 2;
  const COMP_HIGH = 0.7;
  const COMP_MID = 0.3;
  const PERCENT = 100;
  const COLON_PAD = 2;
  const COMP_THRESHOLD_85 = 85;
  const COMP_THRESHOLD_65 = 65;
  const RING_SIZE_MD = 64;
  const RING_STROKE_SM = 4;
  const HEAT_START_WEIGHT = 0.42;
  const ID_SLICE_LENGTH = 8;
  const FRAME_GRADIENT =
    "linear-gradient(155deg, oklch(0.22 0.08 18), oklch(0.09 0.04 18))";

  let { data } = $props();

  let videoElement = $state<HTMLVideoElement>();
  let showOverlay = $state(false);
  let gameCards = $state<GameCard[]>([]);
  let chunkIndex = $state(0);
  let nextInterruptTime = $state(Infinity);
  let interruptInFlight = $state(false);
  let currentTime = $state(0);
  let duration = $state(1);
  let subtitleMode = $state<SubtitleMode>("FILTERED");

  const initialSubtitles = data.subtitles || [];
  const parsedSubtitles: Subtitle[] = initialSubtitles;

  function findSubtitleAtTime(
    subtitles: Subtitle[],
    time: number,
  ): Subtitle | null {
    let left = 0;
    let right = subtitles.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / BINARY_SEARCH_DIVISOR);
      const sub = subtitles[mid];
      if (time < sub.start) {
        right = mid - 1;
      } else if (time >= sub.end) {
        left = mid + 1;
      } else {
        return sub;
      }
    }
    return null;
  }

  const currentSubtitle = $derived(
    findSubtitleAtTime(parsedSubtitles, currentTime),
  );

  const intervalSeconds = $derived(
    (data.gameInterval || GAME.DEFAULT_INTERVAL_MINUTES) * SECONDS_IN_MINUTE,
  );

  function initNextInterrupt() {
    if (intervalSeconds > 0) {
      nextInterruptTime = intervalSeconds * (chunkIndex + 1);
    } else {
      nextInterruptTime = Infinity;
    }
  }

  function advanceChunk() {
    chunkIndex++;
    initNextInterrupt();
    videoElement?.play().catch((err) => console.error(PLAY_FAILED_MSG, err));
  }

  async function handleInterrupt() {
    const query = new URLSearchParams({
      videoId: data.video?.id || "",
      chunkIndex: chunkIndex.toString(),
      start: (nextInterruptTime - intervalSeconds).toString(),
      end: nextInterruptTime.toString(),
      targetLang: data.video?.targetLang || "es",
    });

    try {
      const res = await fetch(`${base}/api/game/generate?${query}`);
      if (!res.ok) {
        throw new Error(`Game generation failed with status ${res.status}`);
      }
      const result = await res.json();
      if (result.cards && result.cards.length > 0) {
        gameCards = result.cards as GameCard[];
        showOverlay = true;
      } else {
        advanceChunk();
      }
    } catch (e) {
      console.error("Game generation failed", e);
      videoElement?.play().catch((err) => console.error(PLAY_FAILED_MSG, err));
    }
  }

  onMount(() => {
    initNextInterrupt();
    // E2E test hook
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__e2eTriggerGameInterrupt = (cards: GameCard[]) => {
      gameCards = cards;
      showOverlay = true;
      videoElement?.pause();
    };
  });

  async function handleTimeUpdate() {
    if (!videoElement || showOverlay || interruptInFlight) return;
    currentTime = videoElement.currentTime;

    if (intervalSeconds === 0) return;
    if (currentTime < nextInterruptTime) return;

    interruptInFlight = true;
    videoElement.pause();
    try {
      await handleInterrupt();
    } finally {
      interruptInFlight = false;
    }
  }

  function handleGameComplete() {
    showOverlay = false;
    chunkIndex++;
    initNextInterrupt();
    videoElement?.play().catch((err) => console.error(PLAY_FAILED_MSG, err));
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

  // Build a 12-bucket heatmap from the raw segment list. Quantising to chunky
  // segments reads as "chapters with personality" instead of pixel noise.
  type HeatBucket = { easy: number; learn: number; hard: number };
  type HeatLevel = "easy" | "learn" | "hard" | "empty";

  const HEAT_MIN_WEIGHT = 0.1;

  function classifySegment(seg: HeatmapSegment): "easy" | "learn" | "hard" {
    if (seg.type === "EASY") return "easy";
    if (seg.type === "LEARNING") return "learn";
    return "hard";
  }

  function dominantLevel(c: HeatBucket): HeatLevel {
    const max = Math.max(c.easy, c.learn, c.hard);
    if (max === 0) return "empty";
    if (max === c.hard) return "hard";
    if (max === c.learn) return "learn";
    return "easy";
  }

  function buildHeatmapBuckets(
    heatmap: HeatmapSegment[],
    totalDuration: number,
  ): HeatLevel[] {
    const buckets: HeatLevel[] = Array(HEATMAP_SEGMENTS).fill("empty");
    if (!heatmap || heatmap.length === 0 || totalDuration <= 0) return buckets;
    const bucketSize = totalDuration / HEATMAP_SEGMENTS;

    const counts: HeatBucket[] = Array.from(
      { length: HEATMAP_SEGMENTS },
      () => ({ easy: 0, learn: 0, hard: 0 }),
    );

    for (const seg of heatmap) {
      const idx = Math.min(
        HEATMAP_SEGMENTS - 1,
        Math.floor(seg.start / bucketSize),
      );
      const weight = Math.max(HEAT_MIN_WEIGHT, seg.end - seg.start);
      counts[idx][classifySegment(seg)] += weight;
    }

    for (let i = 0; i < HEATMAP_SEGMENTS; i++) {
      buckets[i] = dominantLevel(counts[i]);
    }
    return buckets;
  }

  const totalDuration = $derived(
    duration > 1 ? duration : data.video?.duration || 1,
  );
  const heatmapBuckets = $derived(
    buildHeatmapBuckets(data.heatmap || [], totalDuration),
  );
  const playheadIdx = $derived(
    Math.min(
      HEATMAP_SEGMENTS - 1,
      Math.floor((currentTime / totalDuration) * HEATMAP_SEGMENTS),
    ),
  );

  // Comprehension estimate from heatmap composition
  const comprehensionEstimate = $derived.by(() => {
    if (!data.heatmap || data.heatmap.length === 0) return 0;
    let easy = 0,
      learn = 0,
      hard = 0;
    for (const s of data.heatmap) {
      const w = s.end - s.start;
      if (s.type === "EASY") easy += w;
      else if (s.type === "LEARNING") learn += w;
      else hard += w;
    }
    const total = easy + learn + hard;
    if (total === 0) return 0;
    return Math.round(
      ((easy * 1 + learn * COMP_HIGH + hard * COMP_MID) / total) * PERCENT,
    );
  });

  const nextInterruptCountdown = $derived.by(() => {
    if (intervalSeconds === 0 || nextInterruptTime === Infinity) return null;
    const remaining = Math.max(0, nextInterruptTime - currentTime);
    const min = Math.floor(remaining / SECONDS_IN_MINUTE);
    const sec = Math.floor(remaining % SECONDS_IN_MINUTE);
    return `${min.toString().padStart(COLON_PAD, "0")}:${sec.toString().padStart(COLON_PAD, "0")}`;
  });

  function cycleSubtitleMode() {
    const modes: SubtitleMode[] = ["OFF", "FILTERED", "DUAL", "ORIGINAL"];
    const idx = modes.indexOf(subtitleMode);
    subtitleMode = modes[(idx + 1) % modes.length];
  }
</script>

<div class="min-h-screen pb-20" style:background="var(--bg)">
  <!-- Header strip — minimal, sticky -->
  <div
    class="sticky top-0 z-30 flex items-center gap-4 px-6 py-3.5"
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
        <h1
          class="font-display font-bold leading-none truncate"
          style:font-size="18px"
          style:letter-spacing="-0.025em"
        >
          {data.video.title}
        </h1>
        <p
          class="text-[11px] mt-1 font-mono uppercase"
          style:color="var(--fg-3)"
          style:letter-spacing="0.08em"
        >
          {data.video.targetLang?.toUpperCase() || "ES"} → EN ·
          {data.heatmap?.length || 0} segments analyzed
        </p>
      </div>

      <Chip variant="learn" dot>Live transcript</Chip>

      {#if parsedSubtitles.length > 0}
        <button
          class="nx-btn nx-btn-ghost"
          style:padding="5px 10px"
          style:font-size="11px"
          onclick={cycleSubtitleMode}
          title="Cycle subtitle mode"
        >
          CC: {subtitleMode}
        </button>
      {/if}
    {/if}
  </div>

  <div class="max-w-6xl mx-auto p-4 lg:p-8">
    {#if data.video}
      <!-- Video frame -->
      <div
        class="group relative aspect-video rounded-2xl overflow-hidden"
        style:background={FRAME_GRADIENT}
        style:box-shadow="0 30px 80px -20px rgba(0,0,0,0.8)"
        style:border="1px solid var(--line)"
      >
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={videoElement}
          bind:duration
          data-testid="video-player"
          src={data.video.filePath}
          poster={data.video.thumbnailPath}
          controls
          class="w-full h-full"
          ontimeupdate={handleTimeUpdate}
        >
          <track
            kind="subtitles"
            srclang={data.video.targetLang || "es"}
            label="Native ({data.video.targetLang?.toUpperCase() || 'ES'})"
            src="{base}/api/videos/{data.video.id}/subtitles?mode=native"
          />
          <track
            kind="subtitles"
            srclang={data.profile?.nativeLang || "en"}
            label="Filtered & Translated"
            src="{base}/api/videos/{data.video.id}/subtitles?mode=translated"
          />
          <track
            kind="subtitles"
            srclang="multi"
            label="Bilingual"
            src="{base}/api/videos/{data.video.id}/subtitles?mode=bilingual"
          />
        </video>

        {#if parsedSubtitles.length > 0}
          <SubtitleDisplay
            subtitle={currentSubtitle}
            mode={subtitleMode}
            videoTargetLang={data.video.targetLang || "es"}
            onPauseRequest={() => videoElement?.pause()}
            onResumeRequest={() =>
              videoElement
                ?.play()
                .catch((err) => console.error(PLAY_FAILED_MSG, err))}
          />
        {/if}

        <!-- Frame chip overlay -->
        <div class="absolute top-4 left-4 flex gap-2 pointer-events-none">
          <span
            class="chip"
            style:background="rgba(0,0,0,0.6)"
            style:border="1px solid rgba(255,255,255,0.15)"
          >
            <span class="font-mono"
              >{data.video.id?.slice(0, ID_SLICE_LENGTH)?.toUpperCase()}</span
            >
          </span>
        </div>

        {#if showOverlay}
          <!-- fixed overlay to escape video frame bounds -->
          <div class="fixed inset-0 z-50" data-testid="game-overlay">
            <GameOverlay
              cards={gameCards}
              onComplete={handleGameComplete}
              onAnswerSubmitted={handleAnswerSubmitted}
            />
          </div>
        {/if}
      </div>

      <!-- 12-segment chunky heatmap with playhead and "next check" marker -->
      {#if heatmapBuckets.length > 0}
        <div class="mt-5">
          <div class="flex items-center justify-between mb-2">
            <span
              class="font-mono text-[10px] uppercase"
              style:color="var(--fg-3)"
              style:letter-spacing="0.12em"
            >
              Difficulty heatmap · {HEATMAP_SEGMENTS} chapters
            </span>
            <div class="flex gap-3 text-[11px]" style:color="var(--fg-2)">
              <span class="flex items-center gap-1.5">
                <span
                  class="w-2 h-2 rounded-full"
                  style:background="var(--known)"
                ></span>
                Known
              </span>
              <span class="flex items-center gap-1.5">
                <span
                  class="w-2 h-2 rounded-full"
                  style:background="var(--learn)"
                ></span>
                Learning
              </span>
              <span class="flex items-center gap-1.5">
                <span
                  class="w-2 h-2 rounded-full"
                  style:background="var(--hard)"
                ></span>
                Hard
              </span>
            </div>
          </div>

          <button
            type="button"
            class="relative w-full h-3 flex gap-1"
            aria-label="Seek video"
            onclick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              if (videoElement) videoElement.currentTime = pos * totalDuration;
            }}
          >
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

            <!-- Playhead -->
            <div
              class="absolute top-[-4px] bottom-[-4px] pointer-events-none"
              style:left="{(currentTime / totalDuration) * PERCENT}%"
              style:width="2px"
              style:background="var(--fg)"
              style:border-radius="2px"
              style:box-shadow="0 0 10px rgba(255,255,255,0.5)"
            ></div>

            {#if nextInterruptCountdown && nextInterruptTime < Infinity}
              <!-- Next check marker -->
              <div
                class="absolute pointer-events-none flex flex-col items-center"
                style:left="{(nextInterruptTime / totalDuration) * PERCENT}%"
                style:top="-26px"
                style:transform="translateX(-50%)"
              >
                <span
                  class="font-mono uppercase whitespace-nowrap mb-1"
                  style:font-size="9px"
                  style:color="var(--learn-hi)"
                  style:letter-spacing="0.08em"
                >
                  Next check
                </span>
                <div
                  style:width="2px"
                  style:height="20px"
                  style:background="var(--learn)"
                ></div>
              </div>
            {/if}
          </button>
        </div>
      {/if}

      <!-- Single info card + meta -->
      <div class="mt-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <div class="flex-1">
          <h2
            class="font-display"
            style:font-size="36px"
            style:font-weight="800"
            style:letter-spacing="-0.03em"
          >
            {data.video.title}
          </h2>
          <div
            class="flex items-center gap-3 text-sm mt-2"
            style:color="var(--fg-2)"
          >
            <span>{new Date(data.video.createdAt).toLocaleDateString()}</span>
            <span style:color="var(--fg-3)">·</span>
            <span>{data.video.views} views</span>
            <span style:color="var(--fg-3)">·</span>
            <span>
              <Sparkles class="h-3 w-3 inline mr-1" color="var(--learn)" />
              Powered by your vocabulary
            </span>
          </div>
          <p
            class="mt-4 text-[15px] leading-[1.6] max-w-[600px]"
            style:color="var(--fg-2)"
          >
            Notflix tracks every word you encounter during playback.
            {#if comprehensionEstimate >= COMP_THRESHOLD_85}
              You're ready for this — fewer than 15% of words will be new.
            {:else if comprehensionEstimate >= COMP_THRESHOLD_65}
              Comfortable difficulty — expect a knowledge check between scenes.
            {:else}
              Stretch zone. Pause when you need to; the player will quiz you on
              the gaps.
            {/if}
          </p>
        </div>

        <!-- Single InfoCard — Comprehension this session -->
        <div
          class="rounded-[14px] flex items-center gap-5"
          style:padding="18px 20px"
          style:background="var(--surface)"
          style:border="1px solid var(--line)"
        >
          <ComprehensionRing
            value={comprehensionEstimate}
            size={RING_SIZE_MD}
            stroke={RING_STROKE_SM}
          />
          <div class="flex-1 min-w-0">
            <div
              class="font-mono text-[10px] uppercase"
              style:color="var(--fg-3)"
              style:letter-spacing="0.12em"
            >
              Comprehension this session
            </div>
            <div
              class="font-display font-bold mt-1"
              style:font-size="26px"
              style:letter-spacing="-0.025em"
              style:color="var(--fg)"
            >
              {comprehensionEstimate}%
            </div>
            <div class="text-[12px] mt-0.5" style:color="var(--fg-2)">
              {#if nextInterruptCountdown}
                Next check in <strong
                  style:color="var(--learn-hi)"
                  class="font-mono">{nextInterruptCountdown}</strong
                >
              {:else}
                Knowledge checks off
              {/if}
            </div>
          </div>
          <a
            href={resolve("/profile")}
            class="nx-btn nx-btn-outline"
            style:padding="6px 12px"
            style:font-size="12px"
          >
            <Settings class="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <!-- Helper rail under the player -->
      <div class="mt-8 flex flex-wrap gap-3">
        {#if parsedSubtitles.length > 0}
          <button
            class="nx-btn nx-btn-ghost"
            style:font-size="13px"
            onclick={cycleSubtitleMode}
          >
            <FileText class="h-3.5 w-3.5" />
            Subtitles: {subtitleMode}
          </button>
        {/if}
        <a
          href={resolve("/vocabulary")}
          class="nx-btn nx-btn-ghost"
          style:font-size="13px"
        >
          Browse vocabulary
        </a>
        <a
          href={resolve("/profile")}
          class="nx-btn nx-btn-ghost"
          style:font-size="13px"
        >
          Adjust check interval ·
          <span class="font-mono ml-1" style:color="var(--fg)">
            {data.gameInterval || GAME.DEFAULT_INTERVAL_MINUTES}m
          </span>
        </a>
      </div>
    {:else}
      <!-- Not found -->
      <div class="flex flex-col items-center justify-center py-32 text-center">
        <div
          class="w-20 h-20 grid place-items-center rounded-full mb-6"
          style:background="var(--surface)"
          style:border="1px solid var(--line)"
        >
          <ChevronLeft class="h-10 w-10" color="var(--fg-3)" />
        </div>
        <h2 class="font-display text-2xl font-bold mb-2">Video not found</h2>
        <p class="text-sm mb-6" style:color="var(--fg-2)">
          This video might have been removed or is still processing.
        </p>
        <a href={resolve("/studio")} class="nx-btn nx-btn-brand">
          Return to Studio
        </a>
      </div>
    {/if}
  </div>
</div>

<style>
  video::cue {
    background: rgba(10, 8, 8, 0.78);
    color: #f5e9e4;
    font-family: "Geist", system-ui, sans-serif;
    font-size: 1.2rem;
    padding: 0.2rem 0.5rem;
    line-height: 1.4;
  }
</style>
