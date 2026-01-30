<script lang="ts">
    import { base } from '$app/paths';
    import { Input } from "$lib/components/ui/input";
    import * as Select from "$lib/components/ui/select";
    import { Button } from "$lib/components/ui/button";
    import { ChevronLeft, UploadCloud } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';

    interface Props {
        data: PageData & { initialData: { title: string, targetLang: string } };
        form: ActionData & { errors?: Record<string, string[]> };
    }

    let { data, form }: Props = $props();

    // Manual form state using Svelte 5 runes
    let title = $state("");
    let targetLang = $state("es");
    let isSubmitting = $state(false);

    // Sync local state when server data changes
    $effect(() => {
        if (data.initialData) {
            const nextTitle = data.initialData.title;
            const nextLang = data.initialData.targetLang;
            title = nextTitle;
            targetLang = nextLang;
        }
    });

    function getLanguageLabel(lang: string) {
        if (lang === 'es') return 'Spanish (ES)';
        if (lang === 'de') return 'German (DE)';
        if (lang === 'fr') return 'French (FR)';
        return 'Select Language';
    }

    let fileInput: HTMLInputElement;
</script>

<div class="max-w-3xl mx-auto p-8">
    <div class="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" href="{base}/studio" aria-label="Back to Studio">
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
                return async ({ update }) => {
                    await update();
                    isSubmitting = false;
                };
            }}
            class="space-y-6"
        >
            <div class="space-y-2">
                <label class="text-sm font-medium text-zinc-300" for="title">Video Title</label>
                <Input
                    id="title"
                    name="title"
                    bind:value={title}
                    placeholder="e.g. My Awesome Video"
                    class="bg-black/50 border-zinc-700"
                    data-testid="title-input"
                />
                {#if form?.errors?.title}<p class="text-sm text-red-500">{form.errors.title[0]}</p>{/if}
            </div>

            <div class="space-y-2">
                <label class="text-sm font-medium text-zinc-300" for="targetLang">Target Language</label>
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
                {#if form?.errors?.targetLang}<p class="text-sm text-red-500">{form.errors.targetLang[0]}</p>{/if}
            </div>

            <div class="pt-2 space-y-2">
                <label class="text-sm font-medium text-zinc-300" for="file">Video/Audio File</label>
                <div
                    class="group border-2 border-dashed border-zinc-700 rounded-xl p-10 text-center hover:border-red-500 hover:bg-red-900/5 transition-all cursor-pointer relative"
                    onclick={() => fileInput.click()}
                    onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
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
                        data-testid="file-input"
                    />
                    <div class="pointer-events-none flex flex-col items-center justify-center gap-3 group-hover:scale-105 transition-transform">
                        <div class="p-3 bg-zinc-800 rounded-full group-hover:bg-red-600/20 text-zinc-400 group-hover:text-red-500 transition-colors">
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
                {#if form?.errors?.file}<p class="text-sm text-red-500">{form.errors.file[0]}</p>{/if}
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
