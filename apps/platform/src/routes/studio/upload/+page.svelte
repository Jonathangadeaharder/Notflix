<script lang="ts">
  import { base } from "$app/paths";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { ChevronLeft, UploadCloud } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import type { PageData, ActionData } from "./$types";

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

  $effect(() => {
    if (data.initialData) {
      title = data.initialData.title;
      targetLang = data.initialData.targetLang;
      nativeLang = data.initialData.nativeLang;
    }
  });

  let fileInput: HTMLInputElement;
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
        fileError = "";
        if (!fileInput?.files?.length) {
          fileError = "Please select a video or audio file to upload.";
          return ({ cancel }) => cancel();
        }
        isSubmitting = true;
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
        {#if form?.errors?.title}<p class="text-sm text-magenta-500">
            {form.errors.title[0]}
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
          {#if form?.errors?.targetLang}<p class="text-sm text-magenta-500">
              {form.errors.targetLang[0]}
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
          {#if form?.errors?.nativeLang}<p class="text-sm text-magenta-500">
              {form.errors.nativeLang[0]}
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
        {#if form?.errors?.file}<p class="text-sm text-magenta-500">
            {form.errors.file[0]}
          </p>{/if}
        {#if fileError}<p class="text-sm text-magenta-500">{fileError}</p>{/if}
      </div>

      <div class="flex justify-end gap-4 pt-4 border-t border-white/5">
        <Button variant="ghost" href="{base}/studio">Cancel</Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          class="bg-magenta-600 hover:bg-magenta-700 text-white px-8 font-bold"
          data-testid="submit-button"
        >
          {isSubmitting ? "Uploading..." : "Upload Video"}
        </Button>
      </div>
    </form>
  </div>
</div>
