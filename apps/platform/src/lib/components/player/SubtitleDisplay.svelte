<script lang="ts">
    import type { Subtitle, WordData, SubtitleMode } from "./types";

    let {
        subtitle,
        mode = "FILTERED",
        videoTargetLang = "Target",
        onPauseRequest,
    } = $props<{
        subtitle: Subtitle | null;
        mode: SubtitleMode;
        videoTargetLang?: string;
        onPauseRequest?: () => void;
    }>();

    let selectedWord = $state<WordData | null>(null);
    let popupPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });

    function getWordClass(difficulty: string | undefined) {
        if (mode === "DUAL" || mode === "ORIGINAL") return "text-white";

        // Only apply coloring in FILTERED mode if difficulty is provided
        if (difficulty === "hard") return "text-red-500 font-semibold";
        if (difficulty === "learning") return "text-amber-400";
        return "text-white";
    }

    function handleWordClick(word: WordData, event: MouseEvent) {
        if (mode === "OFF") return;

        onPauseRequest?.();

        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const POPUP_OFFSET_Y = 10;
        const CENTER_DIVISOR = 2;
        popupPosition = {
            x: rect.left + rect.width / CENTER_DIVISOR,
            y: rect.top - POPUP_OFFSET_Y,
        };
        selectedWord = word;
    }
</script>

{#if subtitle && mode !== "OFF"}
    <div
        class="absolute bottom-28 left-0 right-0 flex justify-center px-6 pointer-events-none"
    >
        <div
            class="text-center max-w-2xl relative pointer-events-auto bg-black/60 backdrop-blur-sm p-4 rounded-xl"
        >
            <!-- Target Language -->
            <div
                class="text-xl leading-relaxed mb-1"
                data-testid="subtitle-container"
            >
                {#each subtitle.words || [] as word, i (i)}
                    <button
                        type="button"
                        class="hover:underline hover:decoration-amber-400 cursor-pointer transition-all {getWordClass(
                            word.difficulty,
                        )}"
                        onclick={(e) => handleWordClick(word, e)}
                        data-testid="subtitle-word">{word.text}</button
                    >{#if i < (subtitle.words?.length || 0) - 1}<span>
                        </span>{/if}
                {/each}
            </div>

            <!-- Separator (Only for Filtered/Dual) -->
            {#if mode !== "ORIGINAL"}
                <div class="w-48 h-0.5 bg-amber-500/60 mx-auto my-1"></div>
            {/if}

            <!-- Translation (Only for Filtered/Dual) -->
            {#if mode !== "ORIGINAL"}
                <p class="text-sm text-gray-300 italic">
                    {subtitle.translation}
                </p>
            {/if}
        </div>
    </div>
{/if}

<!-- Popup -->
{#if selectedWord}
    <button
        class="fixed inset-0 z-[60] bg-transparent cursor-default"
        onclick={() => (selectedWord = null)}
    ></button>
    <div
        class="fixed z-[70] transform -translate-x-1/2 -translate-y-full"
        style="left: {popupPosition.x}px; top: {popupPosition.y}px;"
        data-testid="word-popup"
    >
        <div
            class="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 p-4 min-w-[200px] max-w-[300px]"
        >
            <div class="flex items-center gap-3 mb-2">
                <span class="text-amber-400 text-lg font-medium"
                    >{selectedWord.lemma || selectedWord.text}</span
                >
                <span
                    class="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded"
                >
                    {videoTargetLang.toUpperCase()}
                </span>
            </div>
            <p class="text-white text-base mb-2">
                {selectedWord.translation || "No translation"}
            </p>
            {#if selectedWord.breakdown}
                <p class="text-sm text-zinc-400 border-t border-zinc-700 pt-2">
                    {selectedWord.breakdown}
                </p>
            {/if}
        </div>
        <div class="flex justify-center">
            <div
                class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-zinc-900"
            ></div>
        </div>
    </div>
{/if}
