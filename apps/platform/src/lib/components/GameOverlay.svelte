<script lang="ts">
  import X from "lucide-svelte/icons/x";
  import Check from "lucide-svelte/icons/check";
  import Keyboard from "lucide-svelte/icons/keyboard";

  let {
    cards = [],
    onComplete,
    onAnswerSubmitted,
  } = $props<{
    cards: Array<{
      lemma: string;
      lang: string;
      original: string;
      contextSentence: string;
      translation?: string;
      cefr?: string;
    }>;
    onComplete: () => void;
    onAnswerSubmitted?: (answer: {
      lemma: string;
      lang: string;
      isKnown: boolean;
    }) => void;
  }>();

  const COMPLETE_RESUME_MS = 1400;

  let currentIndex = $state(0);
  let flipped = $state(false);
  let completed = $state(false);

  const currentCard = $derived(cards[currentIndex]);

  type Rating = {
    key: 1 | 2 | 3 | 4;
    label: string;
    color: string;
    sub: string;
    isKnown: boolean;
  };

  const ratings: Rating[] = [
    {
      key: 1,
      label: "Again",
      color: "var(--hard)",
      sub: "< 1 min",
      isKnown: false,
    },
    { key: 2, label: "Hard", color: "#f97316", sub: "6 min", isKnown: false },
    {
      key: 3,
      label: "Good",
      color: "var(--learn)",
      sub: "1 day",
      isKnown: true,
    },
    {
      key: 4,
      label: "Easy",
      color: "var(--known)",
      sub: "4 days",
      isKnown: true,
    },
  ];

  function rate(r: Rating) {
    if (!currentCard || !flipped) return;

    onAnswerSubmitted?.({
      lemma: currentCard.lemma,
      lang: currentCard.lang,
      isKnown: r.isKnown,
    });

    if (currentIndex + 1 >= cards.length) {
      completed = true;
      setTimeout(() => onComplete(), COMPLETE_RESUME_MS);
    } else {
      currentIndex++;
      flipped = false;
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (completed) return;
    if (e.code === "Space") {
      e.preventDefault();
      flipped = !flipped;
      return;
    }
    if (e.key === "Escape") {
      onComplete();
      return;
    }
    if (!flipped) return;
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 4) {
      e.preventDefault();
      const r = ratings.find((x) => x.key === num);
      if (r) rate(r);
    }
  }

  // Status pill for header progress strip
  function pillColor(i: number, idx: number): string {
    if (i < idx) return "var(--known)";
    if (i === idx) return "var(--learn)";
    return "var(--surface-2)";
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if currentCard || completed}
  <!--
    Takeover overlay — fills its absolute parent (the player frame).
    The world dims, the card rises, the stakes feel real.
  -->
  <div
    class="absolute inset-0 z-50 flex flex-col items-center justify-center"
    style:background="rgba(0,0,0,0.96)"
    style:backdrop-filter="blur(14px) saturate(0.8)"
    style:-webkit-backdrop-filter="blur(14px) saturate(0.8)"
    style:animation="fadeIn .25s ease-out"
    data-testid="game-overlay-takeover"
  >
    <div class="w-[90%] max-w-[900px] px-10 py-8 relative">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <div
            class="font-mono uppercase"
            style:font-size="10px"
            style:color={completed ? "var(--known)" : "var(--learn-hi)"}
            style:letter-spacing="0.14em"
          >
            {completed ? "✓ Gap filled" : "Knowledge check"}
          </div>
          <div
            class="font-display font-bold mt-1.5"
            style:font-size="22px"
            style:letter-spacing="-0.02em"
          >
            {completed
              ? "Resuming playback…"
              : "Fill the gap before the next scene"}
          </div>
        </div>
        <button
          class="w-9 h-9 rounded-full grid place-items-center transition-colors hover:bg-white/10"
          style:background="rgba(255,255,255,0.06)"
          style:color="var(--fg)"
          onclick={() => onComplete()}
          aria-label="Skip knowledge check"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Progress strip -->
      <div class="flex gap-1.5 mb-9">
        <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
        {#each cards as _, i (i)}
          <div
            class="flex-1 rounded-[2px] transition-colors duration-300"
            style:height="3px"
            style:background={pillColor(i, currentIndex)}
          ></div>
        {/each}
      </div>

      {#if completed}
        <!-- Completion state -->
        <div class="text-center py-12">
          <div
            class="w-16 h-16 mx-auto rounded-full grid place-items-center"
            style:background="var(--known)"
            style:color="#000"
          >
            <Check class="h-8 w-8" stroke-width={3} />
          </div>
          <div class="mt-4 text-sm" style:color="var(--fg-2)">
            {cards.length} / {cards.length} reviewed · resuming in {(
              COMPLETE_RESUME_MS / 1000
            ).toFixed(1)}s
          </div>
        </div>
      {:else if currentCard}
        <!-- Card surface — full-bleed cinematic -->
        <button
          type="button"
          class="relative w-full rounded-[16px] cursor-pointer block transition-transform duration-300 hover:-translate-y-0.5"
          style:aspect-ratio="16/7"
          style:background="linear-gradient(155deg, var(--surface-2),
          var(--surface))"
          style:border="1px solid var(--line-2)"
          style:padding="32px"
          onclick={() => (flipped = !flipped)}
          data-testid="card-surface"
          aria-label="Flip card"
        >
          <div
            class="h-full w-full flex flex-col items-center justify-center text-center"
          >
            {#if !flipped}
              <div
                class="font-mono uppercase"
                style:font-size="11px"
                style:color="var(--fg-3)"
                style:letter-spacing="0.14em"
              >
                {currentCard.lang?.toUpperCase() || "ES"}
                {currentCard.cefr ? ` · ${currentCard.cefr}` : ""}
              </div>
              <div
                class="font-display font-extrabold mt-4"
                style:font-size="clamp(48px, 7vw, 72px)"
                style:letter-spacing="-0.035em"
                style:color="var(--fg)"
                data-testid="card-original"
              >
                {currentCard.original || currentCard.lemma}
              </div>
              {#if currentCard.contextSentence}
                <div
                  class="font-mono mt-3 italic"
                  style:font-size="13px"
                  style:color="var(--fg-2)"
                >
                  "{currentCard.contextSentence}"
                </div>
              {/if}
            {:else}
              <div
                class="font-mono uppercase"
                style:font-size="11px"
                style:color="var(--learn-hi)"
                style:letter-spacing="0.14em"
              >
                Translation
              </div>
              <div
                class="font-display font-bold mt-3"
                style:font-size="clamp(36px, 5vw, 48px)"
                style:letter-spacing="-0.025em"
                style:color="var(--learn-hi)"
              >
                {currentCard.translation || "—"}
              </div>
              {#if currentCard.contextSentence}
                <div
                  class="mt-5 italic rounded-[10px] max-w-[560px]"
                  style:padding="12px 18px"
                  style:background="rgba(0,0,0,0.35)"
                  style:font-size="14px"
                  style:color="var(--fg-2)"
                >
                  "{currentCard.contextSentence}"
                </div>
              {/if}
            {/if}
          </div>

          <div
            class="absolute bottom-3.5 right-4 flex items-center gap-1.5 font-mono"
            style:font-size="10px"
            style:color="var(--fg-3)"
          >
            <kbd
              class="inline-block rounded font-mono"
              style:padding="1px 5px"
              style:background="rgba(255,255,255,0.1)"
              style:border="1px solid var(--line-2)"
              style:font-size="10px"
              style:color="var(--fg-2)">SPACE</kbd
            > to flip
          </div>
        </button>

        <!-- SRS rating row — Again / Hard / Good / Easy -->
        <div class="grid grid-cols-4 gap-2 mt-5">
          {#each ratings as r (r.key)}
            <button
              class="rounded-[10px] transition-all"
              style:padding="14px 8px"
              style:background={flipped
                ? `color-mix(in oklab, ${r.color} 15%, transparent)`
                : "var(--surface-2)"}
              style:border="1px solid {flipped ? r.color : 'var(--line)'}"
              style:opacity={flipped ? 1 : 0.45}
              style:cursor={flipped ? "pointer" : "not-allowed"}
              onclick={() => rate(r)}
              disabled={!flipped}
              data-testid="rating-{r.key}"
            >
              <div
                class="font-mono uppercase flex items-center justify-center gap-1.5"
                style:font-size="10px"
                style:color={r.color}
                style:letter-spacing="0.14em"
              >
                <kbd
                  class="inline-block rounded font-mono"
                  style:padding="1px 5px"
                  style:background="rgba(255,255,255,0.1)"
                  style:border="1px solid var(--line-2)"
                  style:font-size="10px"
                  style:color="var(--fg-2)">{r.key}</kbd
                >
                {r.label}
              </div>
              <div
                class="mt-1.5"
                style:font-size="11px"
                style:color="var(--fg-3)"
              >
                {r.sub}
              </div>
            </button>
          {/each}
        </div>

        <!-- Footer row -->
        <div
          class="flex items-center justify-between mt-6 font-mono"
          style:font-size="11px"
          style:color="var(--fg-3)"
        >
          <span>Card {currentIndex + 1} / {cards.length}</span>
          <span class="flex items-center gap-4">
            <span class="flex items-center gap-1.5">
              <Keyboard class="h-3 w-3" /> Keyboard-first
            </span>
            <span class="flex items-center gap-1.5">
              <kbd
                class="inline-block rounded font-mono"
                style:padding="1px 5px"
                style:background="rgba(255,255,255,0.1)"
                style:border="1px solid var(--line-2)"
                style:font-size="10px"
                style:color="var(--fg-2)">ESC</kbd
              >
              skip
            </span>
          </span>
        </div>

        <!-- Hidden test affordances — keep parity with old swipe-based testid hooks
             so existing playwright/vitest checks for swipe-left / swipe-right
             still resolve to a clickable element. -->
        <div class="sr-only">
          <button
            data-testid="swipe-left"
            onclick={() => {
              if (flipped) {
                rate(ratings[0]);
              } else {
                flipped = true;
                rate(ratings[0]);
              }
            }}>Unknown</button
          >
          <button
            data-testid="swipe-right"
            onclick={() => {
              if (flipped) {
                rate(ratings[3]);
              } else {
                flipped = true;
                rate(ratings[3]);
              }
            }}>Known</button
          >
        </div>
      {/if}
    </div>
  </div>
{/if}
