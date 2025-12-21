<script lang="ts">
    import { Motion, useMotionValue, useTransform } from "svelte-motion";
    import { Button } from "$lib/components/ui/button";
    import { X, Check } from 'lucide-svelte';

    let { cards = [], onComplete } = $props();

    const SWIPE_THRESHOLD = 100;
    const DRAG_RANGE = 200;
    const ROTATION_RANGE = 20;

    let currentIndex = $state(0);
    const currentCard = $derived(cards[currentIndex]);

    const x = useMotionValue(0);
    const opacity = useTransform(x, [-DRAG_RANGE, 0, DRAG_RANGE], [0.5, 1, 0.5]);
    const rotate = useTransform(x, [-DRAG_RANGE, DRAG_RANGE], [-ROTATION_RANGE, ROTATION_RANGE]);

    async function handleSwipe(direction: "left" | "right") {
        if (!currentCard) return;

        if (direction === "right") {
            // Known
            console.log("Marking as known:", currentCard.lemma);
            try {
                // Future: await fetch(`${base}/api/words/known`, { method: 'POST', body: JSON.stringify({ lemma: currentCard.lemma, lang: currentCard.lang }) });
            } catch (e) { console.error(e); }
        }

        if (currentIndex + 1 >= cards.length) {
            onComplete();
        } else {
            currentIndex++;
        }
        x.set(0);
    }

    interface DragInfo {
        offset: { x: number; y: number };
    }

    function onDragEnd(_: any, info: DragInfo) {
        if (info.offset.x > SWIPE_THRESHOLD) {
            handleSwipe("right");
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
            handleSwipe("left");
        }
    }
</script>

{#if currentCard}
    <div class="flex flex-col items-center justify-center w-full max-w-md">
        <div class="mb-8 text-center">
            <h3 class="text-white/50 text-sm font-bold uppercase tracking-widest mb-2">Knowledge Check</h3>
            <div class="flex gap-1 justify-center">
                {#each cards as _, i}
                    <div class="h-1 w-6 rounded-full {i < currentIndex ? 'bg-green-500' : i === currentIndex ? 'bg-white' : 'bg-white/10'}"></div>
                {/each}
            </div>
        </div>

        <div class="relative w-full aspect-[3/4] flex items-center justify-center">
            <Motion
                let:motion={m}
                style={{ x, opacity, rotate }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                {onDragEnd}
            >
                <div
                    use:m
                    class="bg-white rounded-3xl p-10 w-full h-full shadow-2xl text-center flex flex-col justify-center cursor-grab active:cursor-grabbing border-4 border-white/20"
                >
                    <span class="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Word to master</span>
                    <h2 class="text-5xl font-black mb-6 text-zinc-900 tracking-tight">
                        {currentCard.original}
                    </h2>
                    
                    <div class="h-px bg-zinc-100 w-12 mx-auto mb-6"></div>
                    
                    <p class="text-zinc-500 italic text-lg leading-relaxed">
                        "{currentCard.contextSentence}"
                    </p>

                    <div class="mt-auto pt-10 flex justify-between gap-4">
                        <Button 
                            variant="outline" 
                            class="flex-1 rounded-2xl h-14 border-zinc-200 text-zinc-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                            onclick={() => handleSwipe("left")}
                        >
                            <X class="mr-2 h-5 w-5" />
                            Unknown
                        </Button>
                        <Button 
                            class="flex-1 rounded-2xl h-14 bg-zinc-900 hover:bg-green-600 text-white transition-all shadow-xl shadow-zinc-200"
                            onclick={() => handleSwipe("right")}
                        >
                            <Check class="mr-2 h-5 w-5" />
                            Known
                        </Button>
                    </div>
                </div>
            </Motion>

            <!-- Swipe hints -->
            <div class="absolute -right-12 top-1/2 -translate-y-1/2 text-green-500/50 pointer-events-none">
                 <Check class="h-12 w-12" />
            </div>
            <div class="absolute -left-12 top-1/2 -translate-y-1/2 text-red-500/50 pointer-events-none">
                 <X class="h-12 w-12" />
            </div>
        </div>
        
        <p class="mt-8 text-white/30 text-xs uppercase tracking-widest font-bold">
            Swipe right if you know it, left if you don't
        </p>
    </div>
{/if}
