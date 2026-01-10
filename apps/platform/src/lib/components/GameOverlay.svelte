<script lang="ts">
    import { spring } from "svelte/motion";
    import { base } from "$app/paths";
    import { Button } from "$lib/components/ui/button";
    import { X, Check } from "lucide-svelte";
    import { UI } from "$lib/constants";

    let { cards = [], onComplete } = $props();

    const SWIPE_THRESHOLD = 100;
    const DRAG_RANGE = 200;
    const ROTATION_RANGE = 20;

    let currentIndex = $state(0);
    const currentCard = $derived(cards[currentIndex]);

    // Spring store for x position
    const x = spring(0, { stiffness: 0.1, damping: 0.5 });
    const rotation = $derived(($x / DRAG_RANGE) * ROTATION_RANGE);
    const opacity = $derived(
        1 - (Math.abs($x) / DRAG_RANGE) * (1 - UI.OPACITY_INACTIVE),
    );

    // Drag State
    let isDragging = $state(false);
    let startX = 0;

    function handlePointerDown(e: PointerEvent) {
        isDragging = true;
        startX = e.clientX;
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging) return;
        x.set(e.clientX - startX, { hard: true }); // Immediate update
    }

    function handlePointerUp() {
        isDragging = false;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);

        if ($x > SWIPE_THRESHOLD) {
            handleSwipe("right");
        } else if ($x < -SWIPE_THRESHOLD) {
            handleSwipe("left");
        } else {
            x.set(0); // Snap back
        }
    }

    async function handleSwipe(direction: "left" | "right") {
        if (!currentCard) return;

        // Optimistic UI: Move to next card immediately
        const lemmaToMark = currentCard.lemma;
        const langToMark = currentCard.lang;

        if (currentIndex + 1 >= cards.length) {
            onComplete();
        } else {
            currentIndex++;
            x.set(0, { hard: true }); // Reset position immediately for next card
        }

        if (direction === "right") {
            // Known - Fire and forget (Optimistic)
            console.log("Marking as known (Optimistic):", lemmaToMark);
            fetch(`${base}/api/words/known`, {
                method: "POST",
                body: JSON.stringify({
                    lemma: lemmaToMark,
                    lang: langToMark,
                }),
            }).catch((e) => console.error("Failed to mark known:", e));
        }
    }

    function getStatusClass(index: number, current: number) {
        if (index < current) return "bg-green-500";
        if (index === current) return "bg-white";
        return "bg-white/10";
    }
</script>

{#if currentCard}
    <div class="flex flex-col items-center justify-center w-full max-w-md">
        <div class="mb-8 text-center">
            <h3
                class="text-white/50 text-sm font-bold uppercase tracking-widest mb-2"
            >
                Knowledge Check
            </h3>
            <div class="flex gap-1 justify-center">
                {#each cards as card, i (i)}
                    <div
                        class="h-1 w-6 rounded-full {getStatusClass(
                            i,
                            currentIndex,
                        )}"
                        data-lemma={card.lemma}
                    ></div>
                {/each}
            </div>
        </div>

        <div
            class="relative w-full aspect-[3/4] flex items-center justify-center perspective-1000"
        >
            <!-- Swipe hints -->
            <div
                class="absolute -right-12 top-1/2 -translate-y-1/2 text-green-500/50 pointer-events-none transition-opacity duration-300"
                style="opacity: {$x > 20 ? Math.min($x / 100, 1) : 0}"
            >
                <Check class="h-12 w-12" />
            </div>
            <div
                class="absolute -left-12 top-1/2 -translate-y-1/2 text-red-500/50 pointer-events-none transition-opacity duration-300"
                style="opacity: {$x < -20
                    ? Math.min(Math.abs($x) / 100, 1)
                    : 0}"
            >
                <X class="h-12 w-12" />
            </div>

            <div
                class="bg-white rounded-3xl p-10 w-full h-full shadow-2xl text-center flex flex-col justify-center cursor-grab active:cursor-grabbing border-4 border-white/20 absolute touch-none select-none"
                style="transform: translate3d({$x}px, 0, 0) rotate({rotation}deg); opacity: {opacity};"
                onpointerdown={handlePointerDown}
                role="button"
                tabindex="0"
            >
                <span
                    class="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4"
                    >Word to master</span
                >
                <h2
                    class="text-5xl font-black mb-6 text-zinc-900 tracking-tight"
                    data-testid="card-original"
                >
                    {currentCard.original}
                </h2>

                <div class="h-px bg-zinc-100 w-12 mx-auto mb-6"></div>

                <p class="text-zinc-500 italic text-lg leading-relaxed">
                    "{currentCard.contextSentence}"
                </p>

                <div
                    class="mt-auto pt-10 flex justify-between gap-4"
                    onpointerdown={(e) => e.stopPropagation()}
                >
                    <Button
                        variant="outline"
                        class="flex-1 rounded-2xl h-14 border-zinc-200 text-zinc-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                        onclick={() => handleSwipe("left")}
                        data-testid="swipe-left"
                    >
                        <X class="mr-2 h-5 w-5" />
                        Unknown
                    </Button>
                    <Button
                        class="flex-1 rounded-2xl h-14 bg-zinc-900 hover:bg-green-600 text-white transition-all shadow-xl shadow-zinc-200"
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
            class="mt-8 text-white/30 text-xs uppercase tracking-widest font-bold"
        >
            Swipe right if you know it, left if you don't
        </p>
    </div>
{/if}

<style>
    .perspective-1000 {
        perspective: 1000px;
    }
</style>
