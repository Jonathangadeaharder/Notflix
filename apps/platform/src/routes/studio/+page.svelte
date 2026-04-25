<script lang="ts">
  import { resolve } from "$app/paths";
  import { enhance } from "$app/forms";
  import { invalidate } from "$app/navigation";
  import Plus from "lucide-svelte/icons/plus";
  import Play from "lucide-svelte/icons/play";
  import RotateCw from "lucide-svelte/icons/rotate-cw";
  import Mic from "lucide-svelte/icons/mic";
  import Languages from "lucide-svelte/icons/languages";
  import Trash2 from "lucide-svelte/icons/trash-2";
  import Settings from "lucide-svelte/icons/settings";
  import Upload from "lucide-svelte/icons/upload";
  import Poster from "$lib/components/brand/Poster.svelte";

  let { data } = $props();
  let submittingId = $state<string | null>(null);

  const POLLING_INTERVAL_MS = 3000;

  $effect(() => {
    const hasPending = data.videos.some((v) => v.status === "PENDING");
    if (!hasPending) return;

    const interval = setInterval(() => {
      if (
        document.visibilityState !== "visible" &&
        !(window as unknown as Record<string, unknown>).__e2e
      )
        return;
      invalidate("app:videos");
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  });

  const STUDIO_HASH_PRIME = 31;
  const STUDIO_HUE_MAX = 360;
  const DIM_BG = "rgba(255,255,255,0.06)";
  const DIM_FG = "var(--fg-2)";
  const WATCH_ROUTE = "/watch/[id]";
  const POSTER_ART_MODULO = 2;

  type StatusKey = "ready" | "processing" | "pending" | "error" | "untracked";

  function statusKey(status: string | null | undefined): StatusKey {
    if (status === "COMPLETED") return "ready";
    if (status === "PENDING") return "processing";
    if (status === "ERROR") return "error";
    return "untracked";
  }

  const statusMeta: Record<
    StatusKey,
    { label: string; color: string; bg: string }
  > = {
    ready: {
      label: "Ready",
      color: "var(--known)",
      bg: "rgba(34,197,94,0.10)",
    },
    processing: {
      label: "Processing",
      color: "var(--learn-hi)",
      bg: "var(--learn-soft)",
    },
    pending: {
      label: "Queued",
      color: DIM_FG,
      bg: DIM_BG,
    },
    error: {
      label: "Error",
      color: "var(--hard)",
      bg: "rgba(239,68,68,0.10)",
    },
    untracked: {
      label: "Untracked",
      color: DIM_FG,
      bg: DIM_BG,
    },
  };

  const PIPE_STEPS = [
    { key: "upload", label: "Upload" },
    { key: "transcribe", label: "Transcribe" },
    { key: "analyze", label: "Analyze" },
    { key: "filter", label: "Filter known" },
    { key: "translate", label: "Translate gaps" },
    { key: "finalize", label: "Finalize" },
  ];

  function pipeStepIndex(stage: string | null | undefined): number {
    const lower = (stage || "").toLowerCase();
    const idx = PIPE_STEPS.findIndex((s) => lower.includes(s.key));
    return idx >= 0 ? idx : 0;
  }

  function stepBgColor(done: boolean, active: boolean): string {
    if (done) return "var(--known)";
    if (active) return "var(--learn)";
    return "var(--surface-2)";
  }

  function stepFgColor(done: boolean, active: boolean): string {
    if (active) return "var(--learn-hi)";
    if (done) return "var(--fg-2)";
    return "var(--fg-3)";
  }

  function hueOf(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++)
      h = (h * STUDIO_HASH_PRIME + id.charCodeAt(i)) >>> 0;
    return h % STUDIO_HUE_MAX;
  }

  function fmtDate(d: Date | string): string {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const totalVideos = $derived(data.videos.length);
  const inProgress = $derived(
    data.videos.filter((v) => v.status === "PENDING"),
  );
  const library = $derived(
    data.videos.filter(
      (v) => v.status === "COMPLETED" || v.status === "ERROR" || !v.status,
    ),
  );
  const readyCount = $derived(
    data.videos.filter((v) => v.status === "COMPLETED").length,
  );
</script>

<svelte:head>
  <title>Studio · Notflix</title>
</svelte:head>

<div class="min-h-screen" style:background="var(--bg)">
  <div class="max-w-7xl mx-auto" style:padding="40px 60px">
    <!-- Header -->
    <div class="flex items-end justify-between flex-wrap gap-4 mb-9">
      <div>
        <div
          class="font-mono uppercase"
          style:font-size="11px"
          style:color="var(--fg-3)"
          style:letter-spacing="0.1em"
        >
          Your library
        </div>
        <h1
          class="font-display"
          style:font-size="40px"
          style:font-weight="800"
          style:letter-spacing="-0.035em"
          style:margin="8px 0 6px"
        >
          Creator Studio
        </h1>
        <p class="text-[15px]" style:color="var(--fg-2)" style:margin="0">
          Upload, process, and manage your learning material — all locally.
        </p>
      </div>
      <div class="flex gap-2.5">
        <button class="nx-btn nx-btn-ghost">
          <Settings class="h-3.5 w-3.5" /> Pipeline
        </button>
        <a
          href={resolve("/studio/upload")}
          class="nx-btn nx-btn-brand"
          data-testid="upload-link"
        >
          <Upload class="h-3.5 w-3.5" /> Upload new video
        </a>
      </div>
    </div>

    <!-- Stat row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-9">
      <div
        class="rounded-[12px]"
        style:padding="18px 20px"
        style:background="var(--surface)"
        style:border="1px solid var(--line)"
      >
        <div
          class="font-mono uppercase"
          style:font-size="10px"
          style:color="var(--fg-3)"
          style:letter-spacing="0.1em"
        >
          Videos in library
        </div>
        <div
          class="font-display font-extrabold mt-1.5"
          style:font-size="30px"
          style:letter-spacing="-0.025em"
        >
          {totalVideos}
        </div>
        <div class="text-[11px] mt-0.5" style:color="var(--fg-2)">
          {readyCount} ready to play
        </div>
      </div>
      <div
        class="rounded-[12px]"
        style:padding="18px 20px"
        style:background="var(--surface)"
        style:border="1px solid var(--line)"
      >
        <div
          class="font-mono uppercase"
          style:font-size="10px"
          style:color="var(--fg-3)"
          style:letter-spacing="0.1em"
        >
          Pipeline queue
        </div>
        <div
          class="font-display font-extrabold mt-1.5"
          style:font-size="30px"
          style:letter-spacing="-0.025em"
          style:color="var(--brand-hi)"
        >
          {inProgress.length}
        </div>
        <div class="text-[11px] mt-0.5" style:color="var(--fg-2)">
          {inProgress.length === 0 ? "Idle" : "Running locally"}
        </div>
      </div>
      <div
        class="rounded-[12px]"
        style:padding="18px 20px"
        style:background="var(--surface)"
        style:border="1px solid var(--line)"
      >
        <div
          class="font-mono uppercase"
          style:font-size="10px"
          style:color="var(--fg-3)"
          style:letter-spacing="0.1em"
        >
          Target language
        </div>
        <div
          class="font-display font-extrabold mt-1.5"
          style:font-size="30px"
          style:letter-spacing="-0.025em"
          style:color="var(--learn-hi)"
        >
          {data.userTargetLang?.toUpperCase()}
        </div>
        <div class="text-[11px] mt-0.5" style:color="var(--fg-2)">
          From your profile
        </div>
      </div>
      <div
        class="rounded-[12px]"
        style:padding="18px 20px"
        style:background="var(--surface)"
        style:border="1px solid var(--line)"
      >
        <div
          class="font-mono uppercase"
          style:font-size="10px"
          style:color="var(--fg-3)"
          style:letter-spacing="0.1em"
        >
          Storage
        </div>
        <div
          class="font-display font-extrabold mt-1.5"
          style:font-size="30px"
          style:letter-spacing="-0.025em"
        >
          Local
        </div>
        <div class="text-[11px] mt-0.5" style:color="var(--fg-2)">
          Zero cloud sync
        </div>
      </div>
    </div>

    <!-- In progress section -->
    {#if inProgress.length > 0}
      <h2
        class="font-mono uppercase mb-4"
        style:font-size="13px"
        style:font-weight="600"
        style:color="var(--fg-3)"
        style:letter-spacing="0.08em"
      >
        In progress · {inProgress.length}
      </h2>
      <div class="flex flex-col gap-3 mb-9">
        {#each inProgress as v (v.id)}
          {@const stepIdx = pipeStepIndex(v.progressStage)}
          <div
            class="rounded-[12px]"
            style:padding="20px"
            style:background="var(--surface)"
            style:border="1px solid var(--line)"
            data-testid="video-item"
          >
            <div class="flex items-center gap-3.5 mb-3.5">
              <div
                class="rounded-[5px] overflow-hidden shrink-0"
                style:width="52px"
                style:height="34px"
              >
                <Poster
                  title={v.title}
                  id={v.id}
                  hue={hueOf(v.id)}
                  variant="placeholder"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold truncate">{v.title}</div>
                <div
                  class="font-mono mt-0.5"
                  style:font-size="11px"
                  style:color="var(--fg-3)"
                >
                  {v.progressStage || "Queued"} · {v.progressPercent ?? 0}%
                </div>
              </div>
              <div
                class="font-mono font-semibold"
                style:font-size="13px"
                style:color="var(--learn-hi)"
              >
                {v.progressPercent ?? 0}%
              </div>
            </div>

            <div class="flex gap-1 mb-2.5">
              {#each PIPE_STEPS as step, i (step.key)}
                {@const done = i < stepIdx}
                {@const active = i === stepIdx}
                <div class="flex-1 relative">
                  <div
                    class="rounded-[2px]"
                    style:height="3px"
                    style:background={stepBgColor(done, active)}
                  ></div>
                  <div
                    class="font-mono uppercase mt-1.5 truncate"
                    style:font-size="9px"
                    style:color={stepFgColor(done, active)}
                    style:letter-spacing="0.06em"
                  >
                    {step.label}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Library table -->
    <h2
      class="font-mono uppercase mb-4"
      style:font-size="13px"
      style:font-weight="600"
      style:color="var(--fg-3)"
      style:letter-spacing="0.08em"
    >
      Library · {library.length}
    </h2>

    {#if library.length === 0 && inProgress.length === 0}
      <div
        class="rounded-[14px] py-20 text-center"
        style:background="var(--surface)"
        style:border="2px dashed var(--line-2)"
      >
        <div
          class="w-16 h-16 mx-auto rounded-full grid place-items-center mb-4"
          style:background="var(--surface-2)"
          style:color="var(--fg-2)"
        >
          <Upload class="h-7 w-7" />
        </div>
        <div class="font-display font-bold" style:font-size="22px">
          No content yet
        </div>
        <p class="text-sm mt-1.5 mb-6" style:color="var(--fg-2)">
          Upload your first video to start building your library.
        </p>
        <a href={resolve("/studio/upload")} class="nx-btn nx-btn-brand">
          <Plus class="h-4 w-4" /> Upload video
        </a>
      </div>
    {:else if library.length > 0}
      <div
        class="rounded-[12px] overflow-hidden"
        style:background="var(--surface)"
        style:border="1px solid var(--line)"
      >
        <!-- Header row -->
        <div
          class="hidden md:grid font-mono uppercase"
          style:grid-template-columns="56px 2.5fr 1fr 1.4fr 200px"
          style:padding="12px 20px"
          style:border-bottom="1px solid var(--line)"
          style:font-size="10px"
          style:color="var(--fg-3)"
          style:letter-spacing="0.1em"
        >
          <span></span>
          <span>Title</span>
          <span>Uploaded</span>
          <span>Status</span>
          <span class="text-right">Actions</span>
        </div>

        {#each library as v, i (v.id)}
          {@const sk = statusKey(v.status)}
          {@const meta = statusMeta[sk]}
          <div
            class="grid items-center transition-colors hover:bg-white/[0.02]"
            style:grid-template-columns="56px 2.5fr 1fr 1.4fr 200px"
            style:padding="14px 20px"
            style:border-bottom={i < library.length - 1
              ? "1px solid var(--line)"
              : "none"}
            data-testid="video-item"
          >
            <a
              href={resolve(WATCH_ROUTE, { id: v.id })}
              class="block w-11 h-7 rounded-[4px] overflow-hidden"
            >
              <Poster
                title={v.title}
                id={v.id}
                hue={hueOf(v.id)}
                variant={i % POSTER_ART_MODULO === 0 ? "art" : "placeholder"}
              />
            </a>
            <a href={resolve(WATCH_ROUTE, { id: v.id })} class="block min-w-0">
              <div class="text-sm font-semibold truncate">{v.title}</div>
              <div class="text-[11px] mt-0.5" style:color="var(--fg-3)">
                {data.userTargetLang?.toUpperCase()} target ·
                {v.hasAnyTranscription ? "Transcribed" : "Awaiting transcript"}
              </div>
            </a>
            <div class="font-mono text-xs" style:color="var(--fg-2)">
              {fmtDate(v.createdAt)}
            </div>
            <div>
              <span
                class="chip"
                style:background={meta.bg}
                style:color={meta.color}
                style:border-color="transparent"
                data-testid="status-{v.status || 'UNPROCESSED'}"
              >
                <span
                  class="inline-block rounded-full"
                  style:width="6px"
                  style:height="6px"
                  style:background={meta.color}
                ></span>
                {meta.label}
              </span>
            </div>
            <div class="flex gap-1.5 justify-end items-center">
              {#if v.status === "ERROR"}
                <form
                  method="POST"
                  action="{resolve('/studio')}?/reprocess"
                  use:enhance={() => {
                    submittingId = v.id;
                    return async ({ update }) => {
                      try {
                        await update();
                      } finally {
                        submittingId = null;
                      }
                    };
                  }}
                >
                  <input type="hidden" name="id" value={v.id} />
                  <input
                    type="hidden"
                    name="targetLang"
                    value={data.userTargetLang}
                  />
                  <button
                    type="submit"
                    class="nx-btn nx-btn-ghost"
                    style:padding="5px 10px"
                    style:font-size="11px"
                    disabled={submittingId === v.id}
                  >
                    <RotateCw class="h-3 w-3" /> Retry
                  </button>
                </form>
              {:else if !v.status && !v.hasAnyTranscription}
                <form
                  method="POST"
                  action="{resolve('/studio')}?/reprocess"
                  use:enhance={() => {
                    submittingId = v.id;
                    return async ({ update }) => {
                      try {
                        await update();
                      } finally {
                        submittingId = null;
                      }
                    };
                  }}
                >
                  <input type="hidden" name="id" value={v.id} />
                  <input
                    type="hidden"
                    name="targetLang"
                    value={data.userTargetLang}
                  />
                  <button
                    type="submit"
                    class="nx-btn nx-btn-ghost"
                    style:padding="5px 10px"
                    style:font-size="11px"
                    disabled={submittingId === v.id}
                  >
                    <Mic class="h-3 w-3" /> Transcribe
                  </button>
                </form>
              {:else if !v.status && v.hasAnyTranscription}
                <form
                  method="POST"
                  action="{resolve('/studio')}?/reprocess"
                  use:enhance={() => {
                    submittingId = v.id;
                    return async ({ update }) => {
                      try {
                        await update();
                      } finally {
                        submittingId = null;
                      }
                    };
                  }}
                >
                  <input type="hidden" name="id" value={v.id} />
                  <input
                    type="hidden"
                    name="targetLang"
                    value={data.userTargetLang}
                  />
                  <button
                    type="submit"
                    class="nx-btn nx-btn-ghost"
                    style:padding="5px 10px"
                    style:font-size="11px"
                    disabled={submittingId === v.id}
                  >
                    <Languages class="h-3 w-3" /> Translate
                  </button>
                </form>
              {:else if v.status === "COMPLETED"}
                <a
                  href={resolve(WATCH_ROUTE, { id: v.id })}
                  class="rounded-full w-8 h-8 grid place-items-center hover:bg-white/5"
                  style:color="var(--fg-2)"
                  aria-label="Play {v.title}"
                >
                  <Play class="h-4 w-4 fill-current" />
                </a>
              {/if}
              <button
                class="rounded-full w-8 h-8 grid place-items-center hover:bg-white/5"
                style:color="var(--fg-3)"
                aria-label="Delete {v.title}"
                disabled
                title="Delete coming soon"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
