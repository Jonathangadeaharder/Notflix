<script lang="ts">
  const DEFAULT_HUE = 340;
  const MONOGRAM_MAX_WORDS = 2;

  let {
    title,
    id = "",
    hue = DEFAULT_HUE,
    variant = "art",
    overlay = "Notflix · Original",
    children,
  }: {
    title: string;
    id?: string;
    hue?: number;
    variant?: "art" | "placeholder";
    overlay?: string;
    children?: import("svelte").Snippet;
  } = $props();

  function monogram(t: string): string {
    if (!t) return "··";
    const cleaned = t.replace(/^(the|a|an|el|la|los|las)\s+/i, "");
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) return "··";
    if (words.length === 1)
      return words[0].slice(0, MONOGRAM_MAX_WORDS).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }
</script>

{#if variant === "art"}
  <div
    class="poster-art"
    style:background={`linear-gradient(155deg, oklch(0.34 0.13 ${hue}) 0%, oklch(0.16 0.08 ${hue}) 55%, var(--bg) 100%)`}
  >
    <div class="poster-sub">{overlay}</div>
    <div class="poster-title">{title}</div>
    {@render children?.()}
  </div>
{:else}
  <div class="poster-ph">
    <div class="poster-monogram">{monogram(title)}</div>
    {#if id}
      <div class="poster-label">[{id}] 2:3</div>
    {/if}
    {@render children?.()}
  </div>
{/if}
