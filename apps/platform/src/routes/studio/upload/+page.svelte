<script lang="ts">
  import { ChevronLeft, FileVideo, UploadCloud } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { INDICES } from "$lib/constants";
  import type { ActionData, PageData } from "./$types";

  interface Props {
    data: PageData & {
      initialData: { title: string; targetLang: string; nativeLang: string };
    };
    form: ActionData & { errors?: Record<string, string[]> };
  }

  let { data, form }: Props = $props();

  let title = $state("");
  let targetLang = $state("es");
  let nativeLang = $state("en");
  let isSubmitting = $state(false);
  let fileError = $state("");
  let selectedFile = $state<File | null>(null);

  $effect(() => {
    if (data.initialData) {
      title = data.initialData.title;
      targetLang = data.initialData.targetLang;
      nativeLang = data.initialData.nativeLang;
    }
  });

  let fileInput: HTMLInputElement;

  const BYTES_PER_KB = 1_024;
  const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

  function formatFileSize(bytes: number): string {
    if (bytes < BYTES_PER_KB) return `${bytes} B`;
    if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
    return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
  }

  function handleFileChange() {
    if (fileInput?.files?.length) {
      selectedFile = fileInput.files[0];
      fileError = "";
    } else {
      selectedFile = null;
    }
  }
</script>

<div class="max-w-3xl mx-auto p-8">
  <div class="flex items-center gap-4 mb-8">
    <Button
      variant="ghost"
      size="icon"
      href={resolve("/studio")}
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
      use:enhance={({ cancel }) => {
        fileError = "";
        if (!fileInput?.files?.length) {
          fileError = "Please select a video or audio file to upload.";
          cancel();
          return;
        }
        isSubmitting = true;
        return async ({ update }) => {
          await update();
          isSubmitting = false;
          if (!form?.errors) {
            goto(resolve("/studio"));
          }
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
        {#if form?.errors?.title}<p class="text-xs mt-1" style:color="var(--hard)">
            {form.errors.title[INDICES.FIRST]}
          </p>{/if}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-zinc-300" for="targetLang"
            >Target Language</label
          >
          <select
            name="targetLang"
            id="targetLang"
            bind:value={targetLang}
            class="w-full bg-black/50 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-magenta-500"
          >
            <option value="en">English (EN)</option>
            <option value="es">Spanish (ES)</option>
            <option value="de">German (DE)</option>
            <option value="fr">French (FR)</option>
          </select>
          {#if form?.errors?.targetLang}<p class="text-xs mt-1" style:color="var(--hard)">
              {form.errors.targetLang[INDICES.FIRST]}
            </p>{/if}
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-zinc-300" for="nativeLang"
            >Your Language</label
          >
          <select
            name="nativeLang"
            id="nativeLang"
            bind:value={nativeLang}
            class="w-full bg-black/50 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-magenta-500"
          >
            <option value="en">English (EN)</option>
            <option value="es">Spanish (ES)</option>
            <option value="de">German (DE)</option>
            <option value="fr">French (FR)</option>
          </select>
          {#if form?.errors?.nativeLang}<p class="text-xs mt-1" style:color="var(--hard)">
              {form.errors.nativeLang[INDICES.FIRST]}
            </p>{/if}
        </div>
      </div>

      <div class="pt-2 space-y-2">
        <label class="text-sm font-medium text-zinc-300" for="file"
          >Video/Audio File</label
        >
        <div
          class="group border-2 border-dashed border-zinc-700 rounded-xl p-10 text-center hover:border-magenta-500 hover:bg-magenta-900/5 transition-all cursor-pointer relative"
          onclick={() => fileInput.click()}
          onkeydown={(e) => e.key === "Enter" && fileInput.click()}
          role="button"
          tabindex="0"
        >
          <input
            type="file"
            id="file"
            name="file"
            accept="video/*,audio/*"
            class="hidden"
            bind:this={fileInput}
            onchange={handleFileChange}
            data-testid="file-input"
          />
          <div
            class="pointer-events-none flex flex-col items-center justify-center gap-3 group-hover:scale-105 transition-transform"
          >
            <div
              class="p-3 bg-zinc-800 rounded-full group-hover:bg-magenta-600/20 text-zinc-400 group-hover:text-magenta-500 transition-colors"
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
        {#if selectedFile}
          <div
            class="flex items-center gap-3 p-3 rounded-lg mt-3"
            style:background="var(--surface)"
            style:border="1px solid var(--line-2)"
          >
            <span style="color: var(--brand-hi)"><FileVideo class="h-4 w-4 shrink-0" /></span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate" style:color="var(--fg)">{selectedFile.name}</p>
              <p class="text-xs" style:color="var(--fg-3)">{formatFileSize(selectedFile.size)} · {selectedFile.type || "unknown type"}</p>
            </div>
          </div>
        {/if}
        {#if form?.errors?.file}<p class="text-xs mt-1" style:color="var(--hard)">
            {form.errors.file[INDICES.FIRST]}
          </p>{/if}
        {#if fileError}<p class="text-xs mt-1" style:color="var(--hard)">{fileError}</p>{/if}
      </div>

      <div class="flex justify-end gap-4 pt-4 border-t border-white/5">
        <Button variant="ghost" href={resolve("/studio")}>Cancel</Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          class="bg-magenta-600 hover:bg-magenta-700 text-white px-8 font-bold"
          data-testid="submit-button"
        >
          {#if isSubmitting}
            <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading…
          {:else}
            Upload Video
          {/if}
        </Button>
      </div>
    </form>
  </div>
</div>
