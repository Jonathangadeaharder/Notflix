<script lang="ts">
  let {
    variant = "neutral",
    dot = false,
    children,
    class: className = "",
  }: {
    variant?: "neutral" | "brand" | "learn" | "known" | "hard";
    dot?: boolean;
    children: import("svelte").Snippet;
    class?: string;
  } = $props();

  const dotColor: Record<string, string> = {
    neutral: "var(--fg-2)",
    brand: "var(--brand-hi)",
    learn: "var(--learn)",
    known: "var(--known)",
    hard: "var(--hard)",
  };
</script>

<span class="chip {variant} {className}">
  {#if dot}
    <span
      class="inline-block rounded-full"
      style:width="6px"
      style:height="6px"
      style:background={dotColor[variant]}
    ></span>
  {/if}
  {@render children()}
</span>
