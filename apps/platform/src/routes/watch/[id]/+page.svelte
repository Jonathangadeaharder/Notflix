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

    // Subtitle state
    let currentSubtitle = $state<{ text: string; translation: string; words?: WordData[] } | null>(null);
    let subtitles = $state<any[]>([]);
    let videoProgress = $derived(videoElement ? (videoElement.currentTime / videoElement.duration) * 100 : 0);

    interface WordData {
        text: string;
        difficulty: 'easy' | 'learning' | 'hard';
    }

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
        
        // Load subtitles
        loadSubtitles();
    });
    
    async function loadSubtitles() {
        try {
            const response = await fetch(`${base}/api/videos/${data.video?.id}/subtitles?mode=translated`);
            const vttText = await response.text();
            
            // Parse VTT
            subtitles = parseVTT(vttText);
        } catch (e) {
            console.error('Failed to load subtitles:', e);
        }
    }
    
    function parseVTT(vttText: string) {
        const lines = vttText.split('\n');
        const subs = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('-->')) {
                const timeMatch = lines[i].match(/(\d+:\d+:\d+\.\d+)\s-->\s+(\d+:\d+:\d+\.\d+)/);
                if (timeMatch) {
                    const start = parseTime(timeMatch[1]);
                    const end = parseTime(timeMatch[2]);
                    let text = '';
                    i++;
                    
                    while (i < lines.length && lines[i].trim() !== '') {
                        text += lines[i] + ' ';
                        i++;
                    }
                    
                    // Split Spanish and English
                    const parts = text.trim().split('\n');
                    if (parts.length >= 2) {
                        subs.push({
                            start,
                            end,
                            text: parts[0],
                            translation: parts[1],
                            words: parseWords(parts[0])
                        });
                    }
                }
            }
        }
        
        return subs;
    }
    
    function parseTime(timeStr: string) {
        const parts = timeStr.split(':');
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    
    function parseWords(text: string): WordData[] {
        // Split into words and assign difficulty based on actual logic
        const words = text.split(' ');
        return words.map(word => ({
            text: word,
            difficulty: word.length > 8 ? 'hard' : word.length > 5 ? 'learning' : 'easy'
        }));
    }
    
    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async function handleTimeUpdate() {
        if (!videoElement || showOverlay || intervalSeconds === 0) return;
        
        // Update current subtitle
        const currentTime = videoElement.currentTime;
        const activeSub = subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);
        currentSubtitle = activeSub || null;

        if (currentTime >= nextInterruptTime) {
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
    <div class="absolute top-0 left-0 right-0 z-50 p-6 bg-gradient-to-b from-black/80 to-transparent">
        <div class="flex items-center justify-between">
            <!-- Back Button -->
            <button class="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                <span class="text-sm">Back</span>
            </button>
            
            <!-- Video Info -->
            {#if data.video}
                <div class="flex items-center gap-4">
                    <div class="text-right">
                        <h1 class="text-lg font-semibold text-white">
                            {data.video.title}
                        </h1>
                        <p class="text-sm text-gray-400">
                            {data.video.targetLang?.toUpperCase() || "ES"} • 92% Comprehension
                        </p>
                    </div>
                    <button class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Add to favorites">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                    </button>
                </div>
            {/if}
        </div>
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
                    class="w-full h-full"
                    ontimeupdate={handleTimeUpdate}
                >
                </video>

                <!-- Subtitle Overlay -->
                {#if currentSubtitle}
                    <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <div class="max-w-4xl mx-auto">
                            <div class="bg-black/90 rounded-lg p-4 backdrop-blur-sm">
                                <!-- Spanish subtitles with color coding -->
                                <div class="text-2xl leading-relaxed mb-2">
                                    {#each currentSubtitle.words || [] as word}
                                        <span
                                            class="transition-colors"
                                            class:text-red-500={word.difficulty === 'hard'}
                                            class:text-amber-500={word.difficulty === 'learning'}
                                            class:text-gray-500={word.difficulty === 'easy'}
                                        >
                                            {word.text}
                                        </span>
                                    {/each}
                                </div>
                                
                                <!-- English translation -->
                                <div class="border-t border-gray-700 pt-2">
                                    <p class="text-base text-gray-300">
                                        {currentSubtitle.translation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Custom Video Controls Overlay -->
                <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/95 to-transparent">
                    <!-- Progress Bar -->
                    <div class="mb-4">
                        <div class="h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                class="h-full bg-amber-500 transition-all duration-100"
                                style="width: {videoProgress}%"
                            ></div>
                        </div>
                    </div>
                    
                    <!-- Controls -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <!-- Play/Pause Button -->
                            <button
                                class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                onclick={() => videoElement?.paused ? videoElement.play() : videoElement?.pause()}
                            >
                                {#if videoElement?.paused}
                                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                                    </svg>
                                {:else}
                                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                                    </svg>
                                {/if}
                            </button>
                            
                            <!-- Time Display -->
                            <span class="text-sm text-white">
                                {formatTime(videoElement?.currentTime || 0)} / {formatTime(videoElement?.duration || 0)}
                            </span>
                        </div>
                        
                        <div class="flex items-center gap-4">
                            <!-- Settings Button with Indicator -->
                            <button class="relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Settings">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <div class="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border border-black"></div>
                            </button>
                        </div>
                    </div>
                </div>

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
