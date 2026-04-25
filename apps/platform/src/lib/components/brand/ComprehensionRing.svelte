<script lang="ts">
  const RING_DEFAULT_SIZE = 44;
  const RING_DEFAULT_STROKE = 3;
  const PERCENT_MAX = 100;
  const HALF = 2;
  const LARGE_SIZE_THRESHOLD = 60;
  const FONT_SCALE = 0.26;
  const SMALL_FONT_SIZE = 11;

  let {
    value = 0,
    size = RING_DEFAULT_SIZE,
    stroke = RING_DEFAULT_STROKE,
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

  const normalizedValue = $derived(
    Number.isFinite(value) ? Math.max(0, Math.min(PERCENT_MAX, value)) : 0,
  );

  const radius = $derived((size - stroke) / HALF);
  const circumference = $derived(HALF * Math.PI * radius);
  const dash = $derived(circumference * (normalizedValue / PERCENT_MAX));
  const color = $derived(
    (() => {
      if (normalizedValue >= KNOWN_THRESHOLD) return "var(--known)";
      if (normalizedValue >= LEARN_THRESHOLD) return "var(--learn)";
      return "var(--hard)";
    })(),
  );
  const fontSize = $derived(
    size > LARGE_SIZE_THRESHOLD ? size * FONT_SCALE : SMALL_FONT_SIZE,
  );
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
      cx={size / HALF}
      cy={size / HALF}
      r={radius}
      fill="none"
      stroke="rgba(255,255,255,0.08)"
      stroke-width={stroke}
    />
    <circle
      cx={size / HALF}
      cy={size / HALF}
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
      {Math.round(normalizedValue)}<span
        class="opacity-60"
        style:font-size="0.6em">%</span
      >
    </div>
  {/if}
</div>
