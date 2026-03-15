<script lang="ts">
  import { base } from "$app/paths";
  import VideoPlayer from "$lib/components/player/VideoPlayer.svelte";
  import { Button } from "$lib/components/ui/button";
  import { ChevronLeft } from "lucide-svelte";
  import { GAME } from "$lib/constants";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let gameCards = $state<unknown[]>([]);

  type HeatmapSegment = { start: number; end: number; type: string };
  const EASY_SEGMENT = "EASY";
  const LEARNING_SEGMENT = "LEARNING";
  const GREEN_HEATMAP = "rgba(34, 197, 94, 0.5)";
  const YELLOW_HEATMAP = "rgba(234, 179, 8, 0.8)";
  const RED_HEATMAP = "rgba(239, 68, 68, 0.5)";

  async function handleRequestGameCards(
    chunkIndex: number,
    start: number,
    end: number,
  ) {
    const query = new URLSearchParams({
      videoId: data.video?.id || "",
      chunkIndex: chunkIndex.toString(),
      start: start.toString(),
      end: end.toString(),
      targetLang: data.video?.targetLang || "es",
    });

    try {
      const res = await fetch(`${base}/api/game/generate?${query}`);
      if (!res.ok) {
        gameCards = [];
        return;
      }

      const result = await res.json();
      gameCards = (result.cards as unknown[] | undefined) ?? [];
    } catch (error) {
      console.error("Game generation failed", error);
      gameCards = [];
    }
  }

  async function handleProgressUpdate(progress: {
    currentTime: number;
    duration: number;
    progressPercent: number;
  }) {
    if (!data.video?.id || !data.session) {
      return;
    }

    try {
      await fetch(`${base}/api/videos/${data.video.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(progress),
      });
    } catch (error) {
      console.error("Failed to persist watch progress", error);
    }
  }

  function getFillColor(type: string) {
    if (type === EASY_SEGMENT) return GREEN_HEATMAP;
    if (type === LEARNING_SEGMENT) return YELLOW_HEATMAP;
    return RED_HEATMAP;
  }

  function drawHeatmap(canvas: HTMLCanvasElement, heatmap: HeatmapSegment[]) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const duration = data.video?.duration || 1;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    for (const seg of heatmap) {
      const startX = (seg.start / duration) * width;
      const w = ((seg.end - seg.start) / duration) * width;
      ctx.fillStyle = getFillColor(seg.type);
      ctx.fillRect(startX, 0, w, height);
    }

    return {
      update(newHeatmap: HeatmapSegment[]) {
        drawHeatmap(canvas, newHeatmap);
      },
    };
  }
</script>

<div class="min-h-screen bg-black text-white pb-20">
  <div
    class="p-4 flex items-center gap-4 border-b border-white/10 bg-zinc-950/50 sticky top-0 z-50 backdrop-blur-md"
  >
    <Button
      variant="ghost"
      size="icon"
      href="{base}/studio"
      class="text-zinc-400 hover:text-white"
    >
      <ChevronLeft class="h-6 w-6" />
    </Button>
    {#if data.video}
      <div>
        <h1 class="font-bold text-lg leading-none">
          {data.video.title}
        </h1>
        <p class="text-xs text-zinc-500 mt-1">
          Watching in {data.video.targetLang?.toUpperCase() || "ES"}
        </p>
      </div>
    {/if}
  </div>

  <div class="max-w-6xl mx-auto p-4 lg:p-8">
    {#if data.video}
      <div
        class="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
      >
        <VideoPlayer
          video={data.video}
          subtitles={data.subtitles}
          settings={{
            gameInterval: data.gameInterval || GAME.DEFAULT_INTERVAL_MINUTES,
          }}
          {gameCards}
          onRequestGameCards={handleRequestGameCards}
          onProgressUpdate={handleProgressUpdate}
        />
      </div>

      {#if data.heatmap && data.heatmap.length > 0}
        <div
          class="mt-4 h-4 w-full bg-zinc-800 rounded-full overflow-hidden relative"
        >
          <canvas
            width="1000"
            height="16"
            class="w-full h-full block"
            use:drawHeatmap={data.heatmap}
          ></canvas>
        </div>

        <div class="flex justify-between text-xs text-zinc-500 mt-1">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            Easy (Known)
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
            Learning (Target)
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            Hard (Too many unknowns)
          </div>
        </div>
      {/if}

      <div
        class="mt-8 flex flex-col md:flex-row gap-8 justify-between items-start"
      >
        <div class="flex-1">
          <h2 class="text-3xl font-bold tracking-tight mb-2">
            {data.video.title}
          </h2>
          <div class="flex items-center gap-4 text-zinc-500 text-sm">
            <span>{new Date(data.video.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>{data.video.views} views</span>
          </div>
        </div>

        <div
          class="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex items-center gap-4"
        >
          <div class="h-10 w-1 bg-red-600 rounded-full"></div>
          <div>
            <p
              class="text-xs font-bold text-zinc-500 uppercase tracking-widest"
            >
              Learning Goal
            </p>
            <p class="text-sm text-zinc-300">
              Intermission every <span class="text-white font-bold"
                >{data.gameInterval || GAME.DEFAULT_INTERVAL_MINUTES}m</span
              >
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            href="{base}/profile"
            class="ml-4 border-white/10 hover:bg-white/5"
          >
            Change
          </Button>
        </div>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center py-40">
        <div class="bg-zinc-900 p-8 rounded-full mb-6">
          <ChevronLeft class="h-12 w-12 text-zinc-700" />
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">Video not found</h2>
        <p class="text-zinc-500 mb-8">
          This video might have been removed or is still processing.
        </p>
        <Button
          href="{base}/studio"
          class="bg-white text-black hover:bg-zinc-200 px-8 font-bold rounded-full"
        >
          Return to Studio
        </Button>
      </div>
    {/if}
  </div>
</div>
