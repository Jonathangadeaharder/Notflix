<script lang="ts">
  import { base } from "$app/paths";
  import type { Subtitle, WordData, SubtitleMode } from "./types";

  let {
    subtitle,
    mode = "FILTERED",
    videoTargetLang = "Target",
    onPauseRequest,
    onMarkKnown,
  } = $props<{
    subtitle: Subtitle | null;
    mode: SubtitleMode;
    videoTargetLang?: string;
    onPauseRequest?: () => void;
    onMarkKnown?: (lemma: string) => void;
  }>();

  const POPUP_OFFSET_Y = 10;
  const CENTER_DIVISOR = 2;
  const HOVER_CLOSE_DELAY_MS = 120;
  type WordTriggerEvent = MouseEvent | FocusEvent;

  let activeWord = $state<WordData | null>(null);
  let popupPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });
  let tooltipPinned = $state(false);
  let tooltipHovered = $state(false);
  let isSavingKnown = $state(false);
  let saveError = $state("");

  let hoverCloseTimeout: ReturnType<typeof setTimeout> | undefined;

  function getWordClass(difficulty: string | undefined) {
    if (mode === "DUAL" || mode === "ORIGINAL") return "text-white";
    if (difficulty === "hard") return "text-red-500 font-semibold";
    if (difficulty === "learning") return "text-amber-400";
    return "text-white";
  }

  function clearHoverCloseTimeout() {
    if (hoverCloseTimeout) {
      clearTimeout(hoverCloseTimeout);
      hoverCloseTimeout = undefined;
    }
  }

  function closeWordDetails() {
    clearHoverCloseTimeout();
    activeWord = null;
    tooltipPinned = false;
    tooltipHovered = false;
    isSavingKnown = false;
    saveError = "";
  }

  function openWordDetails(
    word: WordData,
    event: WordTriggerEvent,
    pinned: boolean,
  ) {
    if (mode === "OFF") return;

    clearHoverCloseTimeout();
    onPauseRequest?.();

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    popupPosition = {
      x: rect.left + rect.width / CENTER_DIVISOR,
      y: rect.top - POPUP_OFFSET_Y,
    };
    tooltipPinned = pinned;
    saveError = "";
    activeWord = word;
  }

  function handleWordHover(word: WordData, event: WordTriggerEvent) {
    openWordDetails(word, event, false);
  }

  function handleWordClick(word: WordData, event: WordTriggerEvent) {
    openWordDetails(word, event, true);
  }

  function scheduleTooltipClose() {
    clearHoverCloseTimeout();

    if (tooltipPinned) {
      return;
    }

    hoverCloseTimeout = setTimeout(() => {
      if (!tooltipHovered) {
        activeWord = null;
      }
    }, HOVER_CLOSE_DELAY_MS);
  }

  async function markWordKnown() {
    if (!activeWord?.lemma || isSavingKnown) {
      return;
    }

    isSavingKnown = true;
    saveError = "";

    try {
      const response = await fetch(`${base}/api/words/known`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lemma: activeWord.lemma,
          lang: videoTargetLang,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save known word");
      }

      onMarkKnown?.(activeWord.lemma);
      closeWordDetails();
    } catch (error) {
      console.error(error);
      saveError = "Could not save this word right now.";
    } finally {
      isSavingKnown = false;
    }
  }
</script>

{#if subtitle && mode !== "OFF"}
  <div
    class="absolute bottom-28 left-0 right-0 flex justify-center px-6 pointer-events-none"
  >
    <div
      class="text-center max-w-2xl relative pointer-events-auto bg-black/60 backdrop-blur-sm p-4 rounded-xl"
    >
      <div
        class="text-xl leading-relaxed mb-1"
        data-testid="subtitle-container"
      >
        {#if subtitle.words && subtitle.words.length > 0}
          {#each subtitle.words as word, i (i)}
            <button
              type="button"
              class="hover:underline hover:decoration-amber-400 cursor-pointer transition-all {getWordClass(
                word.difficulty,
              )}"
              onmouseenter={(event) => handleWordHover(word, event)}
              onfocus={(event) => handleWordHover(word, event)}
              onmouseleave={scheduleTooltipClose}
              onclick={(event) => handleWordClick(word, event)}
              data-testid="subtitle-word">{word.text}</button
            >{word.whitespace ||
              (i < (subtitle.words?.length || 0) - 1 ? " " : "")}
          {/each}
        {:else}
          {subtitle.text}
        {/if}
      </div>

      {#if mode !== "ORIGINAL"}
        <div class="w-48 h-0.5 bg-amber-500/60 mx-auto my-1"></div>
        <p class="text-sm text-gray-300 italic">
          {subtitle.translation}
        </p>
      {/if}
    </div>
  </div>
{/if}

{#if activeWord && tooltipPinned}
  <button
    class="fixed inset-0 z-[60] bg-transparent cursor-default"
    aria-label="Close word details"
    onclick={closeWordDetails}
  ></button>
{/if}

{#if activeWord}
  <div
    class="fixed z-[70] transform -translate-x-1/2 -translate-y-full"
    style="left: {popupPosition.x}px; top: {popupPosition.y}px;"
    data-testid="word-popup"
    role="presentation"
    onmouseenter={() => {
      tooltipHovered = true;
      clearHoverCloseTimeout();
    }}
    onmouseleave={() => {
      tooltipHovered = false;
      scheduleTooltipClose();
    }}
  >
    <div
      class="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 p-4 min-w-[240px] max-w-[320px]"
    >
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="flex items-center gap-3">
          <span class="text-amber-400 text-lg font-medium"
            >{activeWord.lemma || activeWord.text}</span
          >
          <span class="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
            {videoTargetLang.toUpperCase()}
          </span>
        </div>
        {#if tooltipPinned}
          <button
            type="button"
            class="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white"
            onclick={closeWordDetails}
          >
            Close
          </button>
        {/if}
      </div>
      <p class="text-white text-base mb-2">
        {activeWord.translation || "No translation"}
      </p>
      {#if activeWord.breakdown}
        <p class="text-sm text-zinc-400 border-t border-zinc-700 pt-2">
          {activeWord.breakdown}
        </p>
      {/if}

      <div class="mt-4 flex items-center justify-between gap-3">
        <p class="text-[11px] uppercase tracking-widest text-zinc-500">
          Hover reveals, click pins
        </p>
        <button
          type="button"
          class="rounded-full border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
          onclick={markWordKnown}
          disabled={!activeWord.lemma || activeWord.isKnown || isSavingKnown}
        >
          {#if activeWord.isKnown}
            Known
          {:else if isSavingKnown}
            Saving...
          {:else}
            Mark Known
          {/if}
        </button>
      </div>

      {#if saveError}
        <p class="mt-3 text-xs text-red-400">{saveError}</p>
      {/if}
    </div>
    <div class="flex justify-center">
      <div
        class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-zinc-900"
      ></div>
    </div>
  </div>
{/if}
