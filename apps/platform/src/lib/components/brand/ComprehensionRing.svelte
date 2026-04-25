<script lang="ts">
  let {
    value = 0,
    size = 44,
    stroke = 3,
    showLabel = true,
    pulse = false,
  }: {
    value?: number;
    size?: number;
    stroke?: number;
    showLabel?: boolean;
    pulse?: boolean;
  } = $props();

  const KNOWN_THRESHOLD = 85;
  const LEARN_THRESHOLD = 65;

  const radius = $derived((size - stroke) / 2);
  const circumference = $derived(2 * Math.PI * radius);
  const dash = $derived(
    circumference * (Math.max(0, Math.min(100, value)) / 100),
  );
  const color = $derived(
    (() => {
      if (value >= KNOWN_THRESHOLD) return "var(--known)";
      if (value >= LEARN_THRESHOLD) return "var(--learn)";
      return "var(--hard)";
    })(),
  );
  const fontSize = $derived(size > 60 ? size * 0.26 : 11);
</script>

<div
  class="relative inline-grid place-items-center shrink-0"
  style:width="{size}px"
  style:height="{size}px"
  style:animation={pulse ? "ringPulse 3s ease-in-out infinite" : "none"}
>
  <svg
    width={size}
    height={size}
    style="transform: rotate(-90deg)"
    aria-hidden="true"
  >
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke="rgba(255,255,255,0.08)"
      stroke-width={stroke}
    />
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke={color}
      stroke-width={stroke}
      stroke-dasharray="{dash} {circumference}"
      stroke-linecap="round"
      style="transition: stroke-dasharray .6s ease, stroke .3s ease;"
    />
  </svg>
  {#if showLabel}
    <div
      class="absolute inset-0 grid place-items-center font-mono font-bold"
      style:font-size="{fontSize}px"
      style:letter-spacing="-0.02em"
      style:color="var(--fg)"
    >
      {Math.round(value)}<span class="opacity-60" style:font-size="0.6em"
        >%</span
      >
    </div>
  {/if}
</div>
