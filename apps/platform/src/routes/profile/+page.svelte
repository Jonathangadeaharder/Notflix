<script lang="ts">
  import CheckCircle2 from "lucide-svelte/icons/check-circle-2";
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  interface Props {
    data: PageData & { initialData: { gameInterval: string } };
    form: ActionData & { errors?: Record<string, string[]> };
  }

  let { data, form }: Props = $props();

  const initialInterval = data.initialData.gameInterval;
  let gameInterval = $state(initialInterval);
  let isSubmitting = $state(false);
  let isSubmittingLangs = $state(false);

  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
  ];

  const profileTargetLang =
    (data.profile as unknown as { targetLang?: string })?.targetLang || "es";
  const profileNativeLang =
    (data.profile as unknown as { nativeLang?: string })?.nativeLang || "en";
  let targetLang = $state(profileTargetLang);
  let nativeLang = $state(profileNativeLang);

  // Pre-defined interrupt presets — design uses 5/10/15/Off
  const intervalPresets: { v: string; label: string }[] = [
    { v: "5", label: "5 min" },
    { v: "10", label: "10 min" },
    { v: "15", label: "15 min" },
    { v: "20", label: "20 min" },
    { v: "0", label: "Off" },
  ];

  const INITIALS_MAX_CHARS = 2;
  const TOGGLE_COUNT = 3;
  const displayName = $derived.by(() => {
    return (
      data.user?.name ||
      data.profile?.name ||
      data.user?.email?.split("@")[0] ||
      "Notflix user"
    );
  });
  const displayEmail = $derived.by(() => data.user?.email || "");
  const memberSince = $derived.by(() => {
    const created = (data.profile as unknown as { createdAt?: Date | string })
      ?.createdAt;
    if (!created) return "—";
    return new Date(created).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
  });
  const initials = $derived.by(() => {
    const n = displayName.trim();
    if (!n) return "··";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "··";
    if (parts.length === 1)
      return parts[0].slice(0, INITIALS_MAX_CHARS).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });
</script>

<svelte:head>
  <title>Profile · Notflix</title>
</svelte:head>

<div class="min-h-screen" style:background="var(--bg)">
  <div class="max-w-4xl mx-auto" style:padding="40px 60px">
    <div class="mb-8">
      <div
        class="font-mono uppercase"
        style:font-size="11px"
        style:color="var(--fg-3)"
        style:letter-spacing="0.1em"
      >
        Account
      </div>
      <h1
        class="font-display"
        style:font-size="36px"
        style:font-weight="800"
        style:letter-spacing="-0.035em"
        style:margin="6px 0 6px"
      >
        Profile & preferences
      </h1>
    </div>

    <!-- Identity card -->
    <div
      class="rounded-[14px] flex items-center gap-5 mb-5 flex-wrap"
      style:padding="24px"
      style:background="var(--surface)"
      style:border="1px solid var(--line)"
    >
      <div
        class="w-[72px] h-[72px] rounded-full grid place-items-center font-bold text-white shrink-0"
        style:background="linear-gradient(135deg, var(--brand-hi), var(--brand))"
        style:font-size="24px"
      >
        {initials}
      </div>
      <div class="flex-1 min-w-0">
        <div
          class="font-display font-bold truncate"
          style:font-size="22px"
          style:letter-spacing="-0.02em"
        >
          {displayName}
        </div>
        <div class="text-[13px] mt-0.5" style:color="var(--fg-2)">
          {displayEmail} · member since {memberSince}
        </div>
        <div class="flex gap-5 mt-3 flex-wrap">
          <div>
            <div
              class="font-mono uppercase"
              style:font-size="9px"
              style:color="var(--fg-3)"
              style:letter-spacing="0.1em"
            >
              Target language
            </div>
            <div
              class="font-display font-bold mt-0.5"
              style:font-size="18px"
              style:letter-spacing="-0.02em"
            >
              {(
                data.profile as unknown as { targetLang?: string }
              )?.targetLang?.toUpperCase() || "ES"}
            </div>
          </div>
          <div>
            <div
              class="font-mono uppercase"
              style:font-size="9px"
              style:color="var(--fg-3)"
              style:letter-spacing="0.1em"
            >
              Native
            </div>
            <div
              class="font-display font-bold mt-0.5"
              style:font-size="18px"
              style:letter-spacing="-0.02em"
            >
              {(
                data.profile as unknown as { nativeLang?: string }
              )?.nativeLang?.toUpperCase() || "EN"}
            </div>
          </div>
          <div>
            <div
              class="font-mono uppercase"
              style:font-size="9px"
              style:color="var(--fg-3)"
              style:letter-spacing="0.1em"
            >
              Check interval
            </div>
            <div
              class="font-display font-bold mt-0.5"
              style:font-size="18px"
              style:letter-spacing="-0.02em"
              style:color="var(--learn-hi)"
            >
              {gameInterval === "0" ? "Off" : `${gameInterval}m`}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Language selection -->
    <div
      class="rounded-[14px] mb-4"
      style:padding="24px"
      style:background="var(--surface)"
      style:border="1px solid var(--line)"
    >
      <div class="flex items-start gap-3 mb-4">
        <div
          style:width="3px"
          style:height="22px"
          style:background="var(--brand)"
          style:border-radius="2px"
          style:margin-top="2px"
        ></div>
        <div>
          <h3
            class="font-display font-bold"
            style:font-size="18px"
            style:letter-spacing="-0.015em"
            style:margin="0"
          >
            Languages
          </h3>
          <p
            class="text-[13px]"
            style:color="var(--fg-2)"
            style:margin="4px 0 0"
          >
            Set the language you're learning and your native tongue. Notflix
            uses these to filter subtitles and pick flashcards.
          </p>
        </div>
      </div>

      <form
        method="POST"
        action="?/updateLanguages"
        use:enhance={() => {
          isSubmittingLangs = true;
          return async ({ update }) => {
            await update();
            isSubmittingLangs = false;
          };
        }}
        class="flex flex-col gap-4"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              for="targetLang"
              class="text-[12px] font-medium block mb-2"
              style:color="var(--fg-2)"
            >
              Target language
            </label>
            <select
              name="targetLang"
              id="targetLang"
              bind:value={targetLang}
              class="rounded-[10px] w-full font-medium"
              style:padding="12px 14px"
              style:background="var(--bg)"
              style:border="1px solid var(--line-2)"
              style:color="var(--fg)"
              style:font-size="14px"
              style:appearance="none"
            >
              {#each languages as lang (lang.value)}
                <option value={lang.value}>{lang.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label
              for="nativeLang"
              class="text-[12px] font-medium block mb-2"
              style:color="var(--fg-2)"
            >
              Native language
            </label>
            <select
              name="nativeLang"
              id="nativeLang"
              bind:value={nativeLang}
              class="rounded-[10px] w-full font-medium"
              style:padding="12px 14px"
              style:background="var(--bg)"
              style:border="1px solid var(--line-2)"
              style:color="var(--fg)"
              style:font-size="14px"
              style:appearance="none"
            >
              {#each languages as lang (lang.value)}
                <option value={lang.value}>{lang.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="flex gap-3 items-center">
          <button
            type="submit"
            class="nx-btn nx-btn-brand"
            disabled={isSubmittingLangs}
          >
            {isSubmittingLangs ? "Saving…" : "Save languages"}
          </button>
          {#if (form?.data as any)?.nativeLang || (form?.data as any)?.targetLang}
            <span
              class="flex items-center gap-1.5 text-sm"
              style:color="var(--known)"
            >
              <CheckCircle2 class="h-4 w-4" />
              Saved
            </span>
          {/if}
        </div>
      </form>
    </div>

    <!-- Game & Watch settings -->
    <div
      class="rounded-[14px] mb-4"
      style:padding="24px"
      style:background="var(--surface)"
      style:border="1px solid var(--line)"
    >
      <div class="flex items-start gap-3 mb-4">
        <div
          style:width="3px"
          style:height="22px"
          style:background="var(--brand)"
          style:border-radius="2px"
          style:margin-top="2px"
        ></div>
        <div>
          <h3
            class="font-display font-bold"
            style:font-size="18px"
            style:letter-spacing="-0.015em"
            style:margin="0"
          >
            Game & Watch
          </h3>
          <p
            class="text-[13px]"
            style:color="var(--fg-2)"
            style:margin="4px 0 0"
          >
            Control how often interactive learning challenges interrupt
            playback. Set to <em>Off</em> for pure cinema mode.
          </p>
        </div>
      </div>

      <form
        method="POST"
        action="?/updateInterval"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
          };
        }}
        class="flex flex-col gap-4"
      >
        <div>
          <label
            for="gameInterval"
            class="text-[12px] font-medium block mb-2"
            style:color="var(--fg-2)"
          >
            Interrupt interval
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {#each intervalPresets as preset (preset.v)}
              <button
                type="button"
                data-testid="interval-preset"
                aria-pressed={gameInterval === preset.v}
                class="rounded-[10px] font-semibold transition-all"
                style:padding="14px 10px"
                style:background={gameInterval === preset.v
                  ? "var(--learn-soft)"
                  : "var(--bg)"}
                style:border={gameInterval === preset.v
                  ? "1px solid var(--learn)"
                  : "1px solid var(--line-2)"}
                style:color={gameInterval === preset.v
                  ? "var(--learn-hi)"
                  : "var(--fg)"}
                style:font-size="14px"
                onclick={() => (gameInterval = preset.v)}
              >
                {preset.label}
              </button>
            {/each}
          </div>
          <input type="hidden" name="gameInterval" value={gameInterval} />
          {#if form?.errors?.gameInterval}
            <p class="text-sm mt-2" style:color="var(--hard)">
              {form.errors.gameInterval[0]}
            </p>
          {/if}
        </div>

        <div class="flex gap-3 items-center">
          <button
            type="submit"
            class="nx-btn nx-btn-brand"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save settings"}
          </button>
          {#if form?.success}
            <span
              class="flex items-center gap-1.5 text-sm"
              style:color="var(--known)"
            >
              <CheckCircle2 class="h-4 w-4" />
              Saved
            </span>
          {/if}
        </div>
      </form>
    </div>

    <!-- Subtitle behavior -->
    <div
      class="rounded-[14px] mb-4"
      style:padding="24px"
      style:background="var(--surface)"
      style:border="1px solid var(--line)"
    >
      <div class="flex items-start gap-3 mb-4">
        <div
          style:width="3px"
          style:height="22px"
          style:background="var(--brand)"
          style:border-radius="2px"
          style:margin-top="2px"
        ></div>
        <div>
          <h3
            class="font-display font-bold"
            style:font-size="18px"
            style:letter-spacing="-0.015em"
            style:margin="0"
          >
            Subtitle behavior
          </h3>
          <p
            class="text-[13px]"
            style:color="var(--fg-2)"
            style:margin="4px 0 0"
          >
            Defaults that make subtitles feel like part of the film, not a
            heads-up display.
          </p>
          <span
            class="font-mono text-[9px] uppercase"
            style:color="var(--fg-3)"
            style:letter-spacing="0.1em"
            style:background="var(--surface-2)"
            style:padding="2px 8px"
            style:border-radius="4px"
          >
            Coming soon
          </span>
        </div>
      </div>

      {#each [{ label: "Highlight learning words", desc: "Gold-amber pulse on target lemmas", on: true }, { label: "Dim known words", desc: "Reduce visual weight once acquired (Ambient mode)", on: true }, { label: "Hover to pause", desc: "Playback pauses while a word is focused", on: true }, { label: "Auto-translate full sentence", desc: "Display native gloss below foreign line", on: false }] as item, i (i)}
        <div
          class="flex items-center justify-between"
          style:padding="12px 0"
          style:border-bottom={i < TOGGLE_COUNT
            ? "1px solid var(--line)"
            : "none"}
        >
          <div>
            <div class="text-sm font-medium">{item.label}</div>
            <div class="text-[12px] mt-0.5" style:color="var(--fg-2)">
              {item.desc}
            </div>
          </div>
          <span
            class="rounded-full inline-block relative transition-colors"
            style:width="38px"
            style:height="22px"
            style:background={item.on ? "var(--brand)" : "var(--surface-2)"}
          >
            <span
              class="absolute rounded-full bg-white transition-all"
              style:top="2px"
              style:left={item.on ? "18px" : "2px"}
              style:width="18px"
              style:height="18px"
            ></span>
          </span>
        </div>
      {/each}
    </div>

    <!-- About -->
    <div
      class="font-mono mt-8 text-center"
      style:font-size="11px"
      style:color="var(--fg-3)"
      style:letter-spacing="0.06em"
    >
      Notflix runs entirely on your machine. No telemetry · no analytics ·
      vocabulary stays local.
    </div>
  </div>
</div>
