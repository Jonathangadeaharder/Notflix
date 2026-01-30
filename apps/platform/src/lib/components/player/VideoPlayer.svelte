<script lang="ts">
    import { onMount } from "svelte";
    import GameOverlay from "$lib/components/GameOverlay.svelte";
    import SubtitleDisplay from "./SubtitleDisplay.svelte";
    import type {
        PlayerVideo,
        PlayerSettings,
        Subtitle,
        SubtitleMode,
    } from "./types";

    let {
        video,
        subtitles = [],
        settings,
        gameCards = [],
        onRequestGameCards,
    } = $props<{
        video: PlayerVideo;
        subtitles: Subtitle[];
        settings: PlayerSettings;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameCards: any[];
        onRequestGameCards?: (
            chunkIndex: number,
            start: number,
            end: number,
        ) => void;
    }>();

    const SECONDS_IN_MINUTE = 60;
    const PAD_LENGTH = 2;
    const MEDIA_ERR_ABORTED = 1;
    const MEDIA_ERR_NETWORK = 2;
    const MEDIA_ERR_DECODE = 3;
    const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
    const DEFAULT_GAME_INTERVAL = 10;
    const PERCENTAGE_BASE = 100;

    // Player State
    let videoElement = $state<HTMLVideoElement>();
    let isPaused = $state(true);
    let volume = $state(1);
    let isMuted = $state(false);
    let currentTime = $state(0);
    let duration = $state(1);

    // UI State
    let subtitleMode = $state<SubtitleMode>("FILTERED");
    let showOverlay = $state(false);
    let errorState = $state<{ code: number; message: string } | null>(null);

    // Logic State
    let chunkIndex = $state(0);
    let nextInterruptTime = $state(Infinity);
    let isInterrupting = $state(false);

    let intervalSeconds = $derived(
        (settings.gameInterval || DEFAULT_GAME_INTERVAL) * SECONDS_IN_MINUTE,
    );

    let isAudio = $derived(
        video.filePath?.toLowerCase().endsWith(".m4a") ||
            video.filePath?.toLowerCase().endsWith(".mp3"),
    );

    let videoProgress = $derived((currentTime / duration) * PERCENTAGE_BASE);

    let currentSubtitle = $derived(
        subtitles.find(
            (sub) => currentTime >= sub.start && currentTime <= sub.end,
        ) || null,
    );

    // Debug logging
    $effect(() => {
        if (video) {
            console.log(`[Player] Video Path:`, video.filePath);
            console.log(`[Player] Thumbnail Path:`, video.thumbnailPath);
            console.log(`[Player] Is Audio:`, isAudio);
        }
    });

    // Watch for gameCards update to show overlay
    $effect(() => {
        if (gameCards.length > 0 && !showOverlay) {
            showOverlay = true;
            videoElement?.pause();
        }
    });

    function initNextInterrupt() {
        if (intervalSeconds > 0) {
            nextInterruptTime = intervalSeconds * (chunkIndex + 1);
        } else {
            nextInterruptTime = Infinity;
        }
    }

    onMount(() => {
        initNextInterrupt();
    });

    function handleVideoError(e: Event) {
        console.error("[Player] Video Error Event:", e);
        const target = e.target as HTMLVideoElement;

        if (target && target.error) {
            const code = target.error.code;
            let message = target.error.message;

            // Map standard error codes to user-friendly messages
            switch (code) {
                case MEDIA_ERR_ABORTED:
                    message = "Playback aborted by user.";
                    break;
                case MEDIA_ERR_NETWORK:
                    message = "Network error while downloading.";
                    break;
                case MEDIA_ERR_DECODE:
                    message =
                        "Video playback aborted due to a corruption problem or because the video used features your browser did not support.";
                    break;
                case MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message =
                        "The video could not be loaded, either because the server or network failed or because the format is not supported (File might be missing).";
                    break;
            }

            console.error("[Player] Error Details:", code, message);

            errorState = {
                code: code,
                message: message,
            };
        } else {
            errorState = { code: 0, message: "Unknown error occurred" };
        }
    }

    function handleTimeUpdate() {
        if (!videoElement || showOverlay || isInterrupting) return;

        currentTime = videoElement.currentTime;
        duration = videoElement.duration || 1;

        if (currentTime >= nextInterruptTime) {
            isInterrupting = true;
            console.log(`[Player] Interrupt Triggered!`);
            videoElement.pause();

            // Dispatch event to parent to load cards
            if (onRequestGameCards) {
                onRequestGameCards(
                    chunkIndex,
                    nextInterruptTime - intervalSeconds,
                    nextInterruptTime,
                );
            } else {
                // Fallback for demo/no-parent: just skip
                handleGameComplete();
            }
        }
    }

    function handleGameComplete() {
        showOverlay = false;
        isInterrupting = false;
        chunkIndex++;
        initNextInterrupt();
        videoElement?.play().catch((e) => console.error(e));
    }

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / SECONDS_IN_MINUTE);
        const secs = Math.floor(seconds % SECONDS_IN_MINUTE);
        return `${mins}:${secs.toString().padStart(PAD_LENGTH, "0")}`;
    }

    function toggleSubtitleMode() {
        const modes: SubtitleMode[] = ["OFF", "FILTERED", "DUAL", "ORIGINAL"];
        const idx = modes.indexOf(subtitleMode);
        subtitleMode = modes[(idx + 1) % modes.length];
    }
</script>

<div class="relative w-full h-full bg-black group overflow-hidden">
    {#if errorState}
        <div
            class="absolute inset-0 flex items-center justify-center bg-zinc-900 text-red-500 z-20"
        >
            <div class="text-center p-6">
                <h3 class="text-xl font-bold mb-2">Video Error</h3>
                <p>Code: {errorState.code}</p>
                <p class="text-sm opacity-70">{errorState.message}</p>
                <p class="mt-4 text-xs text-zinc-400 break-all">
                    {video.filePath}
                </p>
            </div>
        </div>
    {/if}

    {#if isAudio}
        <div
            class="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-0"
        >
            <!-- Use the thumbnail as background cover if distinct from placeholder -->
            {#if video.thumbnailPath && !video.thumbnailPath.includes("placeholder")}
                <img
                    src={video.thumbnailPath}
                    alt="Album Art"
                    class="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm"
                />
                <img
                    src={video.thumbnailPath}
                    alt="Album Art"
                    class="relative w-64 h-64 rounded-xl shadow-2xl object-cover z-10"
                />
            {:else}
                <div
                    class="relative z-10 w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                    <svg
                        class="w-16 h-16 text-zinc-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                    </svg>
                </div>
                <p class="relative z-10 mt-4 text-zinc-400 font-medium">
                    Audio Only
                </p>
            {/if}
        </div>
    {/if}

    <video
        bind:this={videoElement}
        data-testid="video-player"
        src={video.filePath}
        poster={!isAudio ? video.thumbnailPath : undefined}
        class="w-full h-full object-contain relative z-10 {isAudio
            ? 'opacity-0'
            : ''}"
        ontimeupdate={handleTimeUpdate}
        onerror={handleVideoError}
        onplay={() => (isPaused = false)}
        onpause={() => (isPaused = true)}
        muted={isMuted}
        {volume}
        controls={false}
        oncontextmenu={(e) => e.preventDefault()}
    >
    </video>

    <!-- Force hide native controls -->
    <style>
        video::-webkit-media-controls {
            display: none !important;
        }
        video::-webkit-media-controls-enclosure {
            display: none !important;
        }
    </style>

    <SubtitleDisplay
        subtitle={currentSubtitle}
        mode={subtitleMode}
        videoTargetLang={video.targetLang}
        onPauseRequest={() => videoElement?.pause()}
    />

    <!-- Play Button Overlay -->
    {#if isPaused && !showOverlay && !errorState}
        <div
            class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        >
            <button
                class="w-32 h-32 rounded-full bg-black/60 flex items-center justify-center pointer-events-auto hover:bg-black/80 transition-colors"
                onclick={() => videoElement?.play()}
                data-testid="play-overlay-btn"
            >
                <!-- Play Icon -->
                <svg
                    class="w-16 h-16 ml-2 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                    />
                </svg>
            </button>
        </div>
    {/if}

    <!-- Controls Bar -->
    {#if !errorState}
        <div
            class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/95 to-transparent transition-opacity duration-300 z-30 {isPaused
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'}"
        >
            <!-- Progress -->
            <div
                class="mb-4 cursor-pointer group/progress"
                onclick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    if (videoElement) videoElement.currentTime = pos * duration;
                }}
            >
                <div
                    class="h-1 bg-gray-700 rounded-full overflow-hidden group-hover/progress:h-2 transition-all"
                >
                    <div
                        class="h-full bg-amber-500"
                        style="width: {videoProgress}%"
                    ></div>
                </div>
            </div>

            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <!-- Play/Pause -->
                    <button
                        class="w-8 h-8 flex items-center justify-center hover:text-white/80 text-white"
                        onclick={() =>
                            isPaused
                                ? videoElement?.play()
                                : videoElement?.pause()}
                        data-testid="play-pause-btn"
                    >
                        {#if isPaused}
                            <svg
                                class="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                ><path
                                    d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                                /></svg
                            >
                        {:else}
                            <svg
                                class="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                ><path
                                    fill-rule="evenodd"
                                    d="M5.5 4a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 005.5 4zM14.5 4a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 0014.5 4z"
                                    clip-rule="evenodd"
                                /></svg
                            >
                        {/if}
                    </button>

                    <!-- Volume Control -->
                    <div class="flex items-center gap-2 group/volume relative">
                        <button
                            class="w-8 h-8 flex items-center justify-center hover:text-white/80 text-white"
                            onclick={() => (isMuted = !isMuted)}
                            data-testid="volume-btn"
                        >
                            {#if isMuted || volume === 0}
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                    /><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                                    /></svg
                                >
                            {:else}
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                    /></svg
                                >
                            {/if}
                        </button>

                        <div
                            class="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 ease-out flex items-center"
                        >
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                bind:value={volume}
                                oninput={() => (isMuted = false)}
                                class="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    </div>

                    <!-- Time -->
                    <div class="text-sm text-white leading-tight">
                        <span>{formatTime(currentTime)}</span>
                        <span class="text-gray-400">
                            / {formatTime(duration)}</span
                        >
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <!-- Subtitle Toggle/Mode -->
                    <button
                        class="h-8 px-2 flex items-center justify-center hover:text-white/80 transition-colors text-xs font-bold rounded border border-white/20 {subtitleMode !==
                        'OFF'
                            ? 'bg-white/10 text-white'
                            : 'text-gray-500'}"
                        onclick={toggleSubtitleMode}
                        data-testid="subtitle-btn"
                    >
                        {subtitleMode === "OFF" ? "CC" : subtitleMode}
                    </button>

                    <!-- Fullscreen -->
                    <button
                        class="w-8 h-8 flex items-center justify-center hover:text-white/80 text-white"
                        onclick={() => {
                            if (document.fullscreenElement)
                                document.exitFullscreen();
                            else
                                videoElement
                                    ?.closest(".relative")
                                    ?.requestFullscreen();
                        }}
                        data-testid="fullscreen-btn"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                            /></svg
                        >
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Game Overlay -->
    {#if showOverlay}
        <div
            class="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            data-testid="game-overlay"
        >
            <GameOverlay cards={gameCards} onComplete={handleGameComplete} />
        </div>
    {/if}
</div>
