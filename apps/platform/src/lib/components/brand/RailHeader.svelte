<script lang="ts">
  import ChevronRight from "lucide-svelte/icons/chevron-right";

  let {
    title,
    subtitle,
    seeAllHref,
    onSeeAll,
  }: {
    title: string;
    subtitle?: string;
    seeAllHref?: string;
    onSeeAll?: () => void;
  } = $props();
</script>

<div class="flex items-baseline justify-between mb-5 mt-8">
  <div>
    <h2
      class="text-[22px] font-bold m-0 font-display"
      style:letter-spacing="-0.02em"
      style:color="var(--fg)"
    >
      {title}
    </h2>
    {#if subtitle}
      <div
        class="font-mono mt-1 text-[11px] uppercase"
        style:color="var(--fg-3)"
        style:letter-spacing="0.06em"
      >
        {subtitle}
      </div>
    {/if}
  </div>
  {#if seeAllHref}
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      href={seeAllHref}
      class="text-xs flex items-center gap-1 hover:opacity-80"
      style:color="var(--fg-2)"
    >
      See all <ChevronRight class="h-3 w-3" />
    </a>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {:else if onSeeAll}
    <button
      class="text-xs flex items-center gap-1 hover:opacity-80"
      style:color="var(--fg-2)"
      onclick={onSeeAll}
    >
      See all <ChevronRight class="h-3 w-3" />
    </button>
  {/if}
</div>
