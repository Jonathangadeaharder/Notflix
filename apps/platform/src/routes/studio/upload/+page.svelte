<script lang="ts">
  import { base } from "$app/paths";
  import { Input } from "$lib/components/ui/input";
  import * as Select from "$lib/components/ui/select";
  import { Button } from "$lib/components/ui/button";
  import {
    AlertCircle,
    Check,
    ChevronLeft,
    Clock3,
    UploadCloud,
  } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import type { PageData, ActionData } from "./$types";
  import { TIME } from "$lib/constants";
  import { PIPELINE_STEPS, getUploadStepState } from "$lib/upload-pipeline";

  interface Props {
    data: PageData & { initialData: { title: string; targetLang: string } };
    form: ActionData & {
      errors?: Record<string, string[]>;
      success?: boolean;
      videoId?: string;
    };
  }

  let { data, form }: Props = $props();

  // Manual form state using Svelte 5 runes
  let title = $state("");
  let targetLang = $state("es");
  let isSubmitting = $state(false);
  let isDragActive = $state(false);
  let selectedFileName = $state("");
  let selectedFileSize = $state(0);
  let trackedVideoId = $state<string | null>(null);
  let processingStage = $state("IDLE");
  let processingPercent = $state(0);
  let processingStatus = $state("IDLE");
  const BYTES_IN_KILOBYTE = 1024;
  const BYTES_IN_MEGABYTE = BYTES_IN_KILOBYTE * BYTES_IN_KILOBYTE;

  // Sync local state when server data changes
  $effect(() => {
    if (data.initialData) {
      const nextTitle = data.initialData.title;
      const nextLang = data.initialData.targetLang;
      title = nextTitle;
      targetLang = nextLang;
    }
  });

  $effect(() => {
    if (form?.success && form.videoId) {
      trackedVideoId = form.videoId;
      processingStage = "QUEUED";
      processingPercent = 0;
      processingStatus = "PENDING";
    }
  });

  $effect(() => {
    if (
      !trackedVideoId ||
      processingStatus === "COMPLETED" ||
      processingStatus === "ERROR"
    ) {
      return;
    }

    const pollProgress = async () => {
      const response = await fetch(
        `${base}/api/videos/${trackedVideoId}/progress`,
      );
      if (!response.ok) {
        return;
      }

      const result = await response.json();
      processingStage = result.progressStage || "QUEUED";
      processingPercent = result.progressPercent || 0;
      processingStatus = result.status || "PENDING";
    };

    void pollProgress();
    const interval = setInterval(pollProgress, TIME.POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  });

  function getLanguageLabel(lang: string) {
    if (lang === "es") return "Spanish (ES)";
    if (lang === "de") return "German (DE)";
    if (lang === "fr") return "French (FR)";
    return "Select Language";
  }

  let fileInput: HTMLInputElement;

  function formatFileSize(bytes: number) {
    if (bytes < BYTES_IN_MEGABYTE) {
      return `${Math.round(bytes / BYTES_IN_KILOBYTE)} KB`;
    }

    return `${(bytes / BYTES_IN_MEGABYTE).toFixed(1)} MB`;
  }

  function syncSelectedFile(file: File | null) {
    selectedFileName = file?.name || "";
    selectedFileSize = file?.size || 0;
  }

  function handleFileSelection() {
    syncSelectedFile(fileInput?.files?.[0] || null);
  }

  function assignDroppedFile(file: File) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    syncSelectedFile(file);
  }

  function getStepState(stepKey: (typeof PIPELINE_STEPS)[number]["key"]) {
    return getUploadStepState(
      stepKey,
      processingStage,
      processingStatus,
      isSubmitting,
    );
  }

  function getStepClass(stepKey: (typeof PIPELINE_STEPS)[number]["key"]) {
    const stepState = getStepState(stepKey);

    if (stepState === "complete")
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    if (stepState === "active")
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    if (stepState === "error")
      return "border-red-500/40 bg-red-500/10 text-red-300";
    return "border-zinc-800 bg-black/40 text-zinc-500";
  }
</script>

<div class="max-w-3xl mx-auto p-8">
  <div class="flex items-center gap-4 mb-8">
    <Button
      variant="ghost"
      size="icon"
      href="{base}/studio"
      aria-label="Back to Studio"
    >
      <ChevronLeft class="h-6 w-6" />
    </Button>
    <h1 class="text-3xl font-bold text-white">Upload Video</h1>
  </div>

  <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
    <form
      method="POST"
      action="?/upload"
      enctype="multipart/form-data"
      use:enhance={() => {
        isSubmitting = true;
        processingStage = "UPLOADING";
        processingPercent = 0;
        processingStatus = "PENDING";
        return async ({ update }) => {
          await update();
          isSubmitting = false;
        };
      }}
      class="space-y-6"
    >
      <div class="space-y-2">
        <label class="text-sm font-medium text-zinc-300" for="title"
          >Video Title</label
        >
        <Input
          id="title"
          name="title"
          bind:value={title}
          placeholder="e.g. My Awesome Video"
          class="bg-black/50 border-zinc-700"
          data-testid="title-input"
        />
        {#if form?.errors?.title}<p class="text-sm text-red-500">
            {form.errors.title[0]}
          </p>{/if}
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-zinc-300" for="targetLang"
          >Target Language</label
        >
        <input type="hidden" name="targetLang" value={targetLang} />
        <Select.Root type="single" bind:value={targetLang}>
          <Select.Trigger class="bg-black/50 border-zinc-700 w-full">
            {getLanguageLabel(targetLang)}
          </Select.Trigger>
          <Select.Content class="bg-zinc-900 border-zinc-700 text-white">
            <Select.Item value="es">Spanish (ES)</Select.Item>
            <Select.Item value="de">German (DE)</Select.Item>
            <Select.Item value="fr">French (FR)</Select.Item>
          </Select.Content>
        </Select.Root>
        {#if form?.errors?.targetLang}<p class="text-sm text-red-500">
            {form.errors.targetLang[0]}
          </p>{/if}
      </div>

      <div class="pt-2 space-y-2">
        <label class="text-sm font-medium text-zinc-300" for="file"
          >Video/Audio File</label
        >
        <div
          class="group border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer relative {isDragActive
            ? 'border-red-500 bg-red-900/10'
            : 'border-zinc-700 hover:border-red-500 hover:bg-red-900/5'}"
          onclick={() => fileInput.click()}
          onkeydown={(e) => e.key === "Enter" && fileInput.click()}
          ondragenter={() => (isDragActive = true)}
          ondragover={(event) => {
            event.preventDefault();
            isDragActive = true;
          }}
          ondragleave={(event) => {
            event.preventDefault();
            isDragActive = false;
          }}
          ondrop={(event) => {
            event.preventDefault();
            isDragActive = false;
            const file = event.dataTransfer?.files?.[0];
            if (file) {
              assignDroppedFile(file);
            }
          }}
          role="button"
          tabindex="0"
        >
          <input
            type="file"
            id="file"
            name="file"
            accept="video/*,audio/*"
            required
            class="hidden"
            bind:this={fileInput}
            onchange={handleFileSelection}
            data-testid="file-input"
          />
          <div
            class="pointer-events-none flex flex-col items-center justify-center gap-3 group-hover:scale-105 transition-transform"
          >
            <div
              class="p-3 bg-zinc-800 rounded-full group-hover:bg-red-600/20 text-zinc-400 group-hover:text-red-500 transition-colors"
            >
              <UploadCloud class="w-8 h-8" />
            </div>
            <div>
              <span class="text-zinc-300 font-medium block"
                >Click to upload or drag and drop</span
              >
              <span class="text-xs text-zinc-500 block mt-1"
                >MP4, MP3, WAV (Max 500MB)</span
              >
            </div>
          </div>
        </div>
        {#if selectedFileName}
          <div
            class="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-300"
          >
            <p class="font-semibold">{selectedFileName}</p>
            <p class="text-zinc-500 mt-1">
              {formatFileSize(selectedFileSize)}
            </p>
          </div>
        {/if}
        {#if form?.errors?.file}<p class="text-sm text-red-500">
            {form.errors.file[0]}
          </p>{/if}
      </div>

      <div class="rounded-2xl border border-white/5 bg-black/40 p-5 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p
              class="text-xs font-bold uppercase tracking-widest text-zinc-500"
            >
              Processing Pipeline
            </p>
            <p class="text-sm text-zinc-300 mt-1">
              Track upload, queueing, and AI processing from this page.
            </p>
          </div>
          {#if processingStatus === "ERROR"}
            <div class="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle class="h-4 w-4" />
              Failed
            </div>
          {:else if processingStatus === "COMPLETED"}
            <div class="flex items-center gap-2 text-emerald-400 text-sm">
              <Check class="h-4 w-4" />
              Ready
            </div>
          {:else if isSubmitting || trackedVideoId}
            <div class="flex items-center gap-2 text-amber-300 text-sm">
              <Clock3 class="h-4 w-4" />
              {processingStage}
            </div>
          {/if}
        </div>

        <div class="grid gap-3 md:grid-cols-3">
          {#each PIPELINE_STEPS as step (step.key)}
            <div
              class="rounded-xl border px-4 py-3 text-sm font-medium {getStepClass(
                step.key,
              )}"
            >
              {step.label}
            </div>
          {/each}
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {trackedVideoId
                ? `Video ${trackedVideoId}`
                : "Waiting for upload"}
            </span>
            <span>{processingPercent}%</span>
          </div>
          <div class="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              class="h-full rounded-full bg-red-500 transition-all duration-500"
              style={`width: ${processingPercent}%`}
            ></div>
          </div>
        </div>

        {#if processingStatus === "COMPLETED" && trackedVideoId}
          <div class="flex flex-wrap gap-3 pt-2">
            <Button href={`${base}/watch/${trackedVideoId}`}>
              Start Watching
            </Button>
            <Button href={`${base}/studio`} variant="outline">
              Open Studio
            </Button>
          </div>
        {/if}
      </div>

      <div class="flex justify-end gap-4 pt-4 border-t border-white/5">
        <Button variant="ghost" href="{base}/studio">Cancel</Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          class="bg-red-600 hover:bg-red-700 text-white px-8 font-bold"
          data-testid="submit-button"
        >
          {isSubmitting ? "Uploading..." : "Upload Video"}
        </Button>
      </div>
    </form>
  </div>
</div>
