<script lang="ts">
    import GameOverlay from "$lib/components/GameOverlay.svelte";
    import { onMount } from "svelte";
    import { base } from "$app/paths";
    import { Button } from "$lib/components/ui/button";
    import { ChevronLeft } from "lucide-svelte";

    let { data } = $props();

    let videoElement = $state<HTMLVideoElement>();
    let showOverlay = $state(false);
    let gameCards = $state([]);
    let chunkIndex = $state(0);
    let nextInterruptTime = $state(Infinity);

    const SECONDS_IN_MINUTE = 60;
    const PERCENT_COMPLETE = 100;
    import { GAME } from "$lib/constants";

    // ...

    const intervalSeconds = $derived(
        (data.gameInterval || GAME.DEFAULT_INTERVAL_MINUTES) *
            SECONDS_IN_MINUTE,
    );

    function initNextInterrupt() {
        if (intervalSeconds > 0) {
            nextInterruptTime = intervalSeconds * (chunkIndex + 1);
        } else {
            nextInterruptTime = Infinity;
        }
    }

    onMount(() => {
        initNextInterrupt();
        console.log(
            `[Client] Inited. Interval: ${intervalSeconds}s, Next: ${nextInterruptTime}s`,
        );
    });

    async function handleTimeUpdate() {
        if (!videoElement || showOverlay || intervalSeconds === 0) return;

        if (videoElement.currentTime >= nextInterruptTime) {
            console.log(
                `[Client] Interrupt Triggered! Time: ${videoElement.currentTime} >= ${nextInterruptTime}`,
            );
            videoElement.pause();

            const query = new URLSearchParams({
                videoId: data.video?.id || "",
                chunkIndex: chunkIndex.toString(),
                start: (nextInterruptTime - intervalSeconds).toString(),
                end: nextInterruptTime.toString(),
                targetLang: data.video?.targetLang || "es",
            });

            try {
                const res = await fetch(`${base}/api/game/generate?${query}`);
                const result = await res.json();

                if (result.cards && result.cards.length > 0) {
                    gameCards = result.cards;
                    showOverlay = true;
                } else {
                    // Skip if no cards to show
                    chunkIndex++;
                    initNextInterrupt();
                    videoElement
                        .play()
                        .catch((err) => console.error("Play failed:", err));
                }
            } catch (e) {
                console.error("Game generation failed", e);
                videoElement.play();
            }
        }
    }

    function getHeatmapColor(type: string) {
        if (type === "EASY") return "bg-green-500/50";
        if (type === "LEARNING") return "bg-yellow-500/80";
        return "bg-red-500/50";
    }

    function handleGameComplete() {
        showOverlay = false;
        chunkIndex++;
        initNextInterrupt();
        videoElement?.play().catch((err) => console.error("Play failed:", err));
    }

    function renderHeatmap(canvas: HTMLCanvasElement, heatmap: HeatmapSegment[]) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const duration = data.video?.duration || 1;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        for (const seg of heatmap) {
            const startX = (seg.start / duration) * width;
            const w = ((seg.end - seg.start) / duration) * width;

            // Apply colors directly (matching Tailwind manually or parsing)
            if (seg.type === "EASY")
                ctx.fillStyle = "rgba(34, 197, 94, 0.5)"; // green-500/50
            else if (seg.type === "LEARNING")
                ctx.fillStyle = "rgba(234, 179, 8, 0.8)"; // yellow-500/80
            else ctx.fillStyle = "rgba(239, 68, 68, 0.5)"; // red-500/50

            ctx.fillRect(startX, 0, w, height);
        }
    }
    
    interface HeatmapSegment {
        start: number;
        end: number;
        type: string;
    }
    
    function heatmapAttachment(heatmap: HeatmapSegment[]) {
        return (canvas: HTMLCanvasElement) => {
            renderHeatmap(canvas, heatmap);
        };
    }
</script>

<div class="min-h-screen bg-black text-white pb-20">
    <!-- Header/Nav -->
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
                class="group relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            >
                <!-- svelte-ignore a11y_media_has_caption -->
                <video
                    bind:this={videoElement}
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
                        label="Native ({data.video.targetLang?.toUpperCase() ||
                            'ES'})"
                        src="{base}/api/videos/{data.video
                            .id}/subtitles?mode=native"
                        default
                    />
                    <track
                        kind="subtitles"
                        srclang={data.profile?.nativeLang || "en"}
                        label="Filtered & Translated"
                        src="{base}/api/videos/{data.video
                            .id}/subtitles?mode=translated"
                    />
                    <track
                        kind="subtitles"
                        srclang="multi"
                        label="Bilingual"
                        src="{base}/api/videos/{data.video
                            .id}/subtitles?mode=bilingual"
                    />
                </video>

                {#if showOverlay}
                    <div
                        class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
                        data-testid="game-overlay"
                    >
                        <GameOverlay
                            cards={gameCards}
                            onComplete={handleGameComplete}
                        />
                    </div>
                {/if}
            </div>

            <!-- Heatmap Visualization (Canvas) -->
            {#if data.heatmap && data.heatmap.length > 0 && videoElement}
                <!-- Canvas container -->
                <div
                    class="mt-4 h-4 w-full bg-zinc-800 rounded-full overflow-hidden relative"
                >
                    <canvas
                        width="1000"
                        height="16"
                        class="w-full h-full block"
                        {@attach heatmapAttachment(data.heatmap)}
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
                        <span
                            >{new Date(
                                data.video.createdAt,
                            ).toLocaleDateString()}</span
                        >
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
                            Intermission every <span
                                class="text-white font-bold"
                                >{data.gameInterval ||
                                    GAME.DEFAULT_INTERVAL_MINUTES}m</span
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
                <h2 class="text-2xl font-bold text-white mb-2">
                    Video not found
                </h2>
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

<style>
    /* Styling for the native video track */
    video::cue {
        background: rgba(0, 0, 0, 0.7);
        color: white;
        font-family: sans-serif;
        font-size: 1.2rem;
        padding: 0.2rem 0.5rem;
    }
</style>
