<script lang="ts">
  import { resolve } from "$app/paths";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import {
    ArrowRight,
    Brain,
    Clock3,
    Play,
    Sparkles,
    UploadCloud,
  } from "lucide-svelte";

  type DashboardVideo = {
    id: string;
    title: string;
    thumbnailPath: string;
    createdAt: Date;
    views: number;
    targetLang: string;
    status: string;
    statusLabel: string;
    progressStage: string;
    processingPercent: number;
    watchPercent: number;
    watchSeconds: number;
    watchDuration: number;
    comprehensionPercent: number | null;
  };

  type DashboardData = {
    session: unknown;
    featuredVideo: DashboardVideo | null;
    continueWatching: DashboardVideo | null;
    videos: DashboardVideo[];
  };

  let { data }: { data: DashboardData } = $props();
  const SECONDS_IN_HOUR = 3600;
  const SECONDS_IN_MINUTE = 60;
  const MAX_PERCENT = 100;

  function getStatusVariant(
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" {
    if (status === "Needs Attention") return "destructive";
    if (status === "Continue Watching") return "default";
    if (status === "Processing") return "secondary";
    return "outline";
  }

  function formatRuntime(seconds: number) {
    if (!seconds) return "0m";

    const hours = Math.floor(seconds / SECONDS_IN_HOUR);
    const minutes = Math.floor((seconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  function getCardProgressLabel(video: DashboardVideo) {
    if (video.status !== "COMPLETED") {
      return `${video.progressStage} • ${video.processingPercent}%`;
    }

    if (video.watchPercent > 0 && video.watchPercent < MAX_PERCENT) {
      return `${video.watchPercent}% watched`;
    }

    return "Ready to learn";
  }

  function getWatchHref(videoId: string) {
    return resolve("/watch/[id]", { id: videoId });
  }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-black text-white">
  <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
    {#if data.featuredVideo}
      <section
        class="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl"
      >
        <div
          class="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30 z-10"
        ></div>
        {#if data.featuredVideo.thumbnailPath}
          <img
            src={data.featuredVideo.thumbnailPath}
            alt={data.featuredVideo.title}
            class="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        {/if}
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.25),_transparent_40%)] z-0"
        ></div>

        <div
          class="relative z-20 grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,1fr)_280px] md:px-10 md:py-12"
        >
          <div class="max-w-2xl">
            <Badge
              variant={data.continueWatching ? "default" : "secondary"}
              class="mb-4"
            >
              {data.continueWatching
                ? "Continue Watching"
                : "Featured for Tonight"}
            </Badge>
            <h1 class="text-4xl font-black tracking-tight md:text-5xl">
              {data.featuredVideo.title}
            </h1>
            <p class="mt-4 text-zinc-300 max-w-xl">
              Pick up your next learning session with a live comprehension
              estimate, watch-progress resume point, and the latest processing
              status straight from the pipeline.
            </p>

            <div
              class="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-300"
            >
              <span class="rounded-full border border-white/10 px-3 py-1">
                {data.featuredVideo.targetLang.toUpperCase()}
              </span>
              {#if data.featuredVideo.comprehensionPercent !== null}
                <span class="rounded-full border border-white/10 px-3 py-1">
                  {data.featuredVideo.comprehensionPercent}% comprehension
                </span>
              {/if}
              {#if data.featuredVideo.watchPercent > 0}
                <span class="rounded-full border border-white/10 px-3 py-1">
                  {data.featuredVideo.watchPercent}% watched
                </span>
              {/if}
            </div>

            <div class="mt-8 flex flex-wrap gap-4">
              <Button
                href={getWatchHref(data.featuredVideo.id)}
                class="bg-white text-black hover:bg-zinc-200 font-bold"
              >
                <Play class="mr-2 h-4 w-4 fill-current" />
                {data.continueWatching ? "Resume Session" : "Start Watching"}
              </Button>
              <Button
                href={resolve("/studio/upload")}
                variant="outline"
                class="border-white/15 bg-black/20 hover:bg-white/5"
              >
                <UploadCloud class="mr-2 h-4 w-4" />
                Upload New Media
              </Button>
            </div>
          </div>

          <div class="grid gap-4 self-end">
            <div class="rounded-2xl border border-white/10 bg-black/45 p-4">
              <div class="flex items-center gap-3 text-zinc-400">
                <Clock3 class="h-4 w-4" />
                <span class="text-xs font-bold uppercase tracking-widest">
                  Continue Watching
                </span>
              </div>
              <p class="mt-3 text-2xl font-bold">
                {formatRuntime(data.featuredVideo.watchSeconds)}
              </p>
              <p class="mt-1 text-sm text-zinc-500">saved resume point</p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-black/45 p-4">
              <div class="flex items-center gap-3 text-zinc-400">
                <Brain class="h-4 w-4" />
                <span class="text-xs font-bold uppercase tracking-widest">
                  Comprehension
                </span>
              </div>
              <p class="mt-3 text-2xl font-bold">
                {data.featuredVideo.comprehensionPercent ?? 0}%
              </p>
              <p class="mt-1 text-sm text-zinc-500">
                based on processed subtitle difficulty
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-black/45 p-4">
              <div class="flex items-center gap-3 text-zinc-400">
                <Sparkles class="h-4 w-4" />
                <span class="text-xs font-bold uppercase tracking-widest">
                  Pipeline
                </span>
              </div>
              <p class="mt-3 text-2xl font-bold">
                {data.featuredVideo.progressStage}
              </p>
              <p class="mt-1 text-sm text-zinc-500">
                {data.featuredVideo.processingPercent}% complete
              </p>
            </div>
          </div>
        </div>
      </section>
    {/if}

    <section class="mt-10">
      <div class="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">
            Your Learning Library
          </h2>
          <p class="mt-1 text-sm text-zinc-500">
            Continue active sessions, spot hard videos quickly, and monitor
            processing without leaving the dashboard.
          </p>
        </div>
        <Button href={resolve("/studio")} variant="outline">
          Open Studio
          <ArrowRight class="ml-2 h-4 w-4" />
        </Button>
      </div>

      {#if data.videos.length > 0}
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {#each data.videos as video (video.id)}
            <a
              href={resolve("/watch/[id]", { id: video.id })}
              class="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition-all hover:border-white/20 hover:-translate-y-1"
            >
              <div class="relative aspect-video overflow-hidden">
                {#if video.thumbnailPath}
                  <img
                    src={video.thumbnailPath}
                    alt={video.title}
                    class="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                  />
                {:else}
                  <div
                    class="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-600"
                  >
                    <UploadCloud class="h-10 w-10" />
                  </div>
                {/if}

                <div
                  class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"
                ></div>
                <div class="absolute top-3 right-3">
                  <Badge variant={getStatusVariant(video.statusLabel)}>
                    {video.statusLabel}
                  </Badge>
                </div>
              </div>

              <div class="p-5">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="text-lg font-semibold">
                      {video.title}
                    </h3>
                    <p class="mt-1 text-sm text-zinc-500">
                      {video.targetLang.toUpperCase()} • {new Date(
                        video.createdAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  {#if video.comprehensionPercent !== null}
                    <div class="text-right">
                      <p
                        class="text-xs uppercase tracking-widest text-zinc-500"
                      >
                        Comprehension
                      </p>
                      <p class="text-sm font-bold">
                        {video.comprehensionPercent}%
                      </p>
                    </div>
                  {/if}
                </div>

                <div class="mt-4 space-y-2">
                  <div
                    class="flex items-center justify-between text-xs text-zinc-500"
                  >
                    <span>{getCardProgressLabel(video)}</span>
                    <span>
                      {video.status === "COMPLETED"
                        ? `${video.watchPercent}%`
                        : `${video.processingPercent}%`}
                    </span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      class="h-full rounded-full {video.status === 'COMPLETED'
                        ? 'bg-red-500'
                        : 'bg-amber-400'}"
                      style={`width: ${video.status === "COMPLETED" ? video.watchPercent : video.processingPercent}%`}
                    ></div>
                  </div>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {:else}
        <div
          class="rounded-3xl border border-dashed border-white/10 bg-zinc-950/60 px-8 py-16 text-center"
        >
          <div
            class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-zinc-500"
          >
            <UploadCloud class="h-6 w-6" />
          </div>
          <h3 class="mt-6 text-2xl font-bold">No videos yet</h3>
          <p class="mt-2 text-zinc-500">
            Upload a clip in Studio to start building your learning dashboard.
          </p>
          <Button
            href={resolve("/studio/upload")}
            class="mt-6 bg-red-600 hover:bg-red-700"
          >
            Upload Your First Video
          </Button>
        </div>
      {/if}
    </section>
  </div>
</div>
