<script lang="ts">
  import { onMount } from "svelte";
  import { spring } from "svelte/motion";
  import { base } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import { Check, RotateCw, X } from "lucide-svelte";
  import { UI } from "$lib/constants";

  let { cards = [], onComplete } = $props();

  const SWIPE_THRESHOLD = 100;
  const DRAG_RANGE = 200;
  const ROTATION_RANGE = 20;
  const SWIPE_HINT_THRESHOLD = 20;
  const SWIPE_HINT_MAX_OPACITY = 1;
  const MAX_VISIBLE_CARDS = 5;
  const RESUME_DELAY_MS = 250;
  const FLIP_KEYS = new Set([" ", "Enter"]);
  const RIGHT_SWIPE_KEYS = new Set(["ArrowRight", "3", "4"]);
  const LEFT_SWIPE_KEYS = new Set(["ArrowLeft", "1", "2"]);

  let overlayElement = $state<HTMLDivElement>();
  let currentIndex = $state(0);
  let isFlipped = $state(false);
  let isCompleting = $state(false);
  const visibleCards = $derived(cards.slice(0, MAX_VISIBLE_CARDS));
  const currentCard = $derived(visibleCards[currentIndex]);

  const x = spring(0, { stiffness: 0.1, damping: 0.5 });
  const rotation = $derived(($x / DRAG_RANGE) * ROTATION_RANGE);
  const opacity = $derived(
    1 - (Math.abs($x) / DRAG_RANGE) * (1 - UI.OPACITY_INACTIVE),
  );

  let isDragging = $state(false);
  let startX = 0;

  onMount(() => {
    overlayElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard || isCompleting) {
        return;
      }

      const keyAction = getKeyboardAction(event.key);
      if (!keyAction) {
        return;
      }

      event.preventDefault();

      if (keyAction === "flip") {
        isFlipped = !isFlipped;
        return;
      }

      void handleSwipe(keyAction);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function getKeyboardAction(key: string): "flip" | "left" | "right" | null {
    if (FLIP_KEYS.has(key)) {
      return "flip";
    }

    if (RIGHT_SWIPE_KEYS.has(key)) {
      return "right";
    }

    if (LEFT_SWIPE_KEYS.has(key)) {
      return "left";
    }

    return null;
  }

  function handlePointerDown(e: PointerEvent) {
    isDragging = true;
    startX = e.clientX;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    x.set(e.clientX - startX, { hard: true });
  }

  function handlePointerUp() {
    isDragging = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);

    if ($x > SWIPE_THRESHOLD) {
      void handleSwipe("right");
    } else if ($x < -SWIPE_THRESHOLD) {
      void handleSwipe("left");
    } else {
      x.set(0);
    }
  }

  async function handleSwipe(direction: "left" | "right") {
    if (!currentCard || isCompleting) return;

    const lemmaToMark = currentCard.lemma;
    const langToMark = currentCard.lang;

    if (direction === "right") {
      fetch(`${base}/api/words/known`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lemma: lemmaToMark,
          lang: langToMark,
        }),
      }).catch((e) => console.error("Failed to mark known:", e));
    }

    if (currentIndex + 1 >= visibleCards.length) {
      isCompleting = true;
      x.set(0, { hard: true });
      await new Promise((resolve) => setTimeout(resolve, RESUME_DELAY_MS));
      onComplete();
      return;
    }

    currentIndex++;
    isFlipped = false;
    x.set(0, { hard: true });
  }

  function getStatusClass(index: number, current: number) {
    if (index < current) return "bg-emerald-400";
    if (index === current) return "bg-white";
    return "bg-white/10";
  }
</script>

{#if currentCard}
  <div
    class="flex w-full max-w-md flex-col items-center justify-center outline-none"
  >
    <div class="mb-8 text-center">
      <h3
        class="text-white/50 text-sm font-bold uppercase tracking-widest mb-2"
      >
        Knowledge Check
      </h3>
      <p class="text-xs text-zinc-500 mb-3">
        Review the next {visibleCards.length} cards with keyboard or swipe controls
      </p>
      <div class="flex gap-1 justify-center">
        {#each visibleCards as card, i (i)}
          <div
            class="h-1 w-6 rounded-full {getStatusClass(i, currentIndex)}"
            data-lemma={card.lemma}
          ></div>
        {/each}
      </div>
    </div>

    <div
      class="relative w-full aspect-[3/4] flex items-center justify-center perspective-1000"
    >
      <div
        class="absolute -right-12 top-1/2 -translate-y-1/2 text-emerald-400/50 pointer-events-none transition-opacity duration-300"
        style="opacity: {$x > SWIPE_HINT_THRESHOLD
          ? Math.min($x / SWIPE_THRESHOLD, SWIPE_HINT_MAX_OPACITY)
          : 0}"
      >
        <Check class="h-12 w-12" />
      </div>
      <div
        class="absolute -left-12 top-1/2 -translate-y-1/2 text-red-400/50 pointer-events-none transition-opacity duration-300"
        style="opacity: {$x < -SWIPE_HINT_THRESHOLD
          ? Math.min(Math.abs($x) / SWIPE_THRESHOLD, SWIPE_HINT_MAX_OPACITY)
          : 0}"
      >
        <X class="h-12 w-12" />
      </div>

      <div
        bind:this={overlayElement}
        class="absolute h-full w-full rounded-3xl border border-white/10 bg-zinc-950 p-10 text-center shadow-2xl flex flex-col justify-center touch-none select-none"
        style="transform: translate3d({$x}px, 0, 0) rotate({rotation}deg); opacity: {opacity};"
        onpointerdown={handlePointerDown}
        role="button"
        tabindex="0"
      >
        {#if isCompleting}
          <div class="space-y-6">
            <p
              class="text-xs font-bold uppercase tracking-widest text-emerald-300"
            >
              Session Complete
            </p>
            <h2 class="text-4xl font-black tracking-tight text-white">
              Resuming your lesson...
            </h2>
            <p class="text-zinc-400">
              Your last answer has been saved. The video will continue in a
              moment.
            </p>
          </div>
        {:else if !isFlipped}
          <span
            class="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4"
          >
            Front • Term {currentIndex + 1} / {visibleCards.length}
          </span>
          <h2
            class="text-5xl font-black mb-6 text-white tracking-tight"
            data-testid="card-original"
          >
            {currentCard.original}
          </h2>

          <div class="h-px bg-white/10 w-12 mx-auto mb-6"></div>

          <p class="text-zinc-400 text-lg leading-relaxed">
            Press <span class="text-white font-semibold">Space</span> to flip
          </p>
        {:else}
          <span
            class="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4"
          >
            Back • Meaning
          </span>
          <h2 class="text-4xl font-black mb-6 text-amber-300 tracking-tight">
            {currentCard.translation}
          </h2>

          <div class="h-px bg-white/10 w-12 mx-auto mb-6"></div>

          <p class="text-zinc-400 italic text-lg leading-relaxed">
            "{currentCard.contextSentence}"
          </p>
        {/if}

        <div
          class="mt-auto pt-10 flex flex-wrap justify-between gap-3"
          onpointerdown={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            class="flex-1 rounded-2xl h-14 border-white/10 bg-black/40 text-zinc-300 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 transition-all"
            onclick={() => handleSwipe("left")}
            data-testid="swipe-left"
          >
            <X class="mr-2 h-5 w-5" />
            Unknown
          </Button>
          <Button
            variant="outline"
            class="rounded-2xl h-14 border-white/10 bg-black/40 text-zinc-300 hover:bg-white/5 transition-all"
            onclick={() => (isFlipped = !isFlipped)}
          >
            <RotateCw class="mr-2 h-4 w-4" />
            Flip
          </Button>
          <Button
            class="flex-1 rounded-2xl h-14 bg-emerald-500 hover:bg-emerald-400 text-black transition-all shadow-xl shadow-emerald-950/40"
            onclick={() => handleSwipe("right")}
            data-testid="swipe-right"
          >
            <Check class="mr-2 h-5 w-5" />
            Known
          </Button>
        </div>
      </div>
    </div>

    <p
      class="mt-8 text-white/30 text-xs uppercase tracking-widest font-bold text-center"
    >
      Keyboard: 1-2 unknown, 3-4 known, Space flips the card
    </p>
  </div>
{/if}

<style>
  .perspective-1000 {
    perspective: 1000px;
  }
</style>
