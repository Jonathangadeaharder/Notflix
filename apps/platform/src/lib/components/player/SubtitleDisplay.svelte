<script lang="ts">
  import { base } from "$app/paths";
  import type { Subtitle, WordData, SubtitleMode } from "./types";

  let {
    subtitle,
    mode = "FILTERED",
    videoTargetLang = "Target",
    onPauseRequest,
    onResumeRequest,
    onMarkKnown,
  } = $props<{
    subtitle: Subtitle | null;
    mode: SubtitleMode;
    videoTargetLang?: string;
    onPauseRequest?: () => void;
    onResumeRequest?: () => void;
    onMarkKnown?: (lemma: string) => void;
  }>();

  const POPUP_OFFSET_Y = 16;
  const HOVER_OPEN_DELAY_MS = 180;
  const HOVER_CLOSE_DELAY_MS = 120;
  type WordTriggerEvent = MouseEvent | FocusEvent;

  let activeWord = $state<WordData | null>(null);
  let activeIndex = $state<number | null>(null);
  let popupPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });
  let tooltipPinned = $state(false);
  let tooltipHovered = $state(false);
  let isSavingKnown = $state(false);
  let saveError = $state("");

  let hoverOpenTimeout: ReturnType<typeof setTimeout> | undefined;
  let hoverCloseTimeout: ReturnType<typeof setTimeout> | undefined;

  function tokenClass(word: WordData): string {
    if (mode === "ORIGINAL" || mode === "DUAL") return "tok tok-easy";
    if (word.difficulty === "hard") return "tok tok-hard";
    if (word.difficulty === "learning") return "tok tok-learn-pulse";
    return "tok tok-easy";
  }

  function clearOpenTimeout() {
    if (hoverOpenTimeout) {
      clearTimeout(hoverOpenTimeout);
      hoverOpenTimeout = undefined;
    }
  }

  function clearCloseTimeout() {
    if (hoverCloseTimeout) {
      clearTimeout(hoverCloseTimeout);
      hoverCloseTimeout = undefined;
    }
  }

  function closeWordDetails(opts: { resume?: boolean } = {}) {
    clearOpenTimeout();
    clearCloseTimeout();
    activeWord = null;
    activeIndex = null;
    tooltipPinned = false;
    tooltipHovered = false;
    isSavingKnown = false;
    saveError = "";
    if (opts.resume) {
      onResumeRequest?.();
    }
  }

  function openAt(
    word: WordData,
    index: number,
    event: WordTriggerEvent,
    pinned: boolean,
  ) {
    if (mode === "OFF") return;
    clearOpenTimeout();
    clearCloseTimeout();

    onPauseRequest?.();

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    popupPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top - POPUP_OFFSET_Y,
    };
    tooltipPinned = pinned;
    saveError = "";
    activeWord = word;
    activeIndex = index;
  }

  function handleWordEnter(
    word: WordData,
    index: number,
    event: WordTriggerEvent,
  ) {
    if (mode === "OFF" || tooltipPinned) return;
    clearCloseTimeout();
    clearOpenTimeout();

    // Capture the rect synchronously — by the time the timeout fires, the
    // pointer may have left and `event.currentTarget` is gone (also why JSDOM
    // crashed in tests). The position is what we actually need to keep.
    const target = event.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    const capturedX = rect ? rect.left + rect.width / 2 : 0;
    const capturedY = rect ? rect.top - POPUP_OFFSET_Y : 0;

    // 180ms delay so the trackpad cursor merely passing through doesn't
    // pause the video — only an intentional rest opens the tooltip.
    hoverOpenTimeout = setTimeout(() => {
      if (mode === "OFF") return;
      onPauseRequest?.();
      popupPosition = { x: capturedX, y: capturedY };
      tooltipPinned = false;
      saveError = "";
      activeWord = word;
      activeIndex = index;
    }, HOVER_OPEN_DELAY_MS);
  }

  function handleWordLeave() {
    clearOpenTimeout();
    if (tooltipPinned) return;

    clearCloseTimeout();
    hoverCloseTimeout = setTimeout(() => {
      if (!tooltipHovered && !tooltipPinned) {
        closeWordDetails({ resume: true });
      }
    }, HOVER_CLOSE_DELAY_MS);
  }

  function handleWordClick(
    word: WordData,
    index: number,
    event: WordTriggerEvent,
  ) {
    if (tooltipPinned && activeIndex === index) {
      closeWordDetails({ resume: true });
      return;
    }
    openAt(word, index, event, true);
  }

  async function markWordKnown() {
    if (!activeWord?.lemma || isSavingKnown) return;
    isSavingKnown = true;
    saveError = "";
    try {
      const response = await fetch(`${base}/api/words/known`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lemma: activeWord.lemma,
          lang: videoTargetLang,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save known word");
      }
      onMarkKnown?.(activeWord.lemma);
      closeWordDetails({ resume: true });
    } catch (error) {
      console.error(error);
      saveError = "Could not save this word right now.";
    } finally {
      isSavingKnown = false;
    }
  }

  function getDifficultyLabel(d: WordData["difficulty"] | undefined): string {
    if (d === "hard") return "new";
    if (d === "learning") return "learning";
    return "known";
  }

  function getDifficultyChipClass(
    d: WordData["difficulty"] | undefined,
  ): string {
    if (d === "hard") return "hard";
    if (d === "learning") return "learn";
    return "known";
  }
</script>

{#if subtitle && mode !== "OFF"}
  <div
    class="absolute bottom-28 left-0 right-0 flex justify-center px-6 pointer-events-none"
  >
    <div
      class="text-center max-w-3xl relative pointer-events-auto"
      style:padding="14px 24px"
      style:border-radius="10px"
      style:background="rgba(0,0,0,0.55)"
      style:backdrop-filter="blur(8px)"
    >
      <div
        class="text-[28px] font-medium leading-[1.4]"
        data-testid="subtitle-container"
        style:letter-spacing="-0.015em"
      >
        {#if subtitle.words && subtitle.words.length > 0}
          {#each subtitle.words as word, i (i)}
            <button
              type="button"
              class="{tokenClass(word)} {activeIndex === i ? 'tok-active' : ''}"
              onmouseenter={(event) => handleWordEnter(word, i, event)}
              onfocus={(event) => handleWordEnter(word, i, event)}
              onmouseleave={handleWordLeave}
              onblur={handleWordLeave}
              onclick={(event) => handleWordClick(word, i, event)}
              data-testid="subtitle-word">{word.text}</button
            >{word.whitespace ||
              (i < (subtitle.words?.length || 0) - 1 ? " " : "")}
          {/each}
        {:else}
          {subtitle.text}
        {/if}
      </div>

      {#if mode !== "ORIGINAL" && subtitle.translation}
        <div
          class="mx-auto mt-2"
          style:width="48px"
          style:height="1px"
          style:background="var(--learn-soft)"
        ></div>
        <p class="text-sm italic mt-2" style:color="var(--fg-2)">
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
    onclick={() => closeWordDetails({ resume: true })}
  ></button>
{/if}

{#if activeWord}
  <div
    class="fixed z-[70]"
    style:left="{popupPosition.x}px"
    style:top="{popupPosition.y}px"
    style:transform="translate(-50%, -100%)"
    data-testid="word-popup"
    role="presentation"
    onmouseenter={() => {
      tooltipHovered = true;
      clearCloseTimeout();
    }}
    onmouseleave={() => {
      tooltipHovered = false;
      handleWordLeave();
    }}
  >
    <div
      class="rounded-[12px] min-w-[280px] max-w-[340px]"
      style:background="rgba(10, 8, 8, 0.96)"
      style:border="1px solid var(--line-2)"
      style:box-shadow="var(--shadow-lg)"
      style:padding="16px 18px"
    >
      <div class="flex items-baseline gap-2.5">
        <span
          class="text-[22px] font-bold"
          style:letter-spacing="-0.02em"
          style:font-family="var(--font-display)"
          style:color="var(--fg)"
        >
          {activeWord.lemma || activeWord.text}
        </span>
        {#if activeWord.partOfSpeech}
          <span class="font-mono text-[11px]" style:color="var(--fg-3)">
            /{activeWord.partOfSpeech}/
          </span>
        {/if}
        <span
          class="chip {getDifficultyChipClass(activeWord.difficulty)} ml-auto"
          style:font-size="10px"
        >
          {getDifficultyLabel(activeWord.difficulty)}
        </span>
      </div>

      <div class="text-[15px] mt-1.5" style:color="var(--fg-2)">
        {activeWord.translation || "No translation"}
      </div>

      {#if activeWord.breakdown}
        <div
          class="mt-3 italic text-[13px] rounded-lg"
          style:padding="10px 12px"
          style:background="rgba(255,255,255,0.04)"
          style:color="var(--fg-2)"
        >
          {activeWord.breakdown}
        </div>
      {/if}

      <div class="flex gap-2 mt-3">
        <button
          type="button"
          class="nx-btn nx-btn-brand"
          style:padding="7px 12px"
          style:font-size="12px"
          onclick={markWordKnown}
          disabled={!activeWord.lemma || activeWord.isKnown || isSavingKnown}
        >
          {#if activeWord.isKnown}
            ✓ Known
          {:else if isSavingKnown}
            Saving…
          {:else}
            + Mark known
          {/if}
        </button>
        <button
          type="button"
          class="nx-btn nx-btn-outline"
          style:padding="7px 12px"
          style:font-size="12px"
          onclick={() => closeWordDetails({ resume: true })}
        >
          {tooltipPinned ? "Close" : "Resume"}
        </button>
      </div>

      {#if saveError}
        <p class="mt-2.5 text-xs" style:color="var(--hard)">{saveError}</p>
      {/if}

      <div
        class="mt-3 font-mono uppercase"
        style:font-size="9px"
        style:letter-spacing="0.12em"
        style:color="var(--fg-3)"
      >
        Hover reveals · click pins · esc closes
      </div>
    </div>
  </div>
{/if}
