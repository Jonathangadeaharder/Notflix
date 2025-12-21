<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as Select from "$lib/components/ui/select";
    import * as Card from "$lib/components/ui/card";
    import { CheckCircle2 } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import type { PageData, ActionData } from './$types';

    interface Props {
        data: PageData & { initialData: { gameInterval: string } };
        form: ActionData & { errors?: Record<string, string[]> };
    }

    let { data, form }: Props = $props();

    // Manual form state using Svelte 5 runes
    let gameInterval = $state(data.initialData.gameInterval);
    let isSubmitting = $state(false);

    // Sync local state when server data changes (e.g. after a redirect or invalidation)
    $effect(() => {
        gameInterval = data.initialData.gameInterval;
    });

    function getIntervalLabel(value: string) {
        const num = Number(value);
        if (num === 0) return 'Off (Netflix Mode)';
        return `Every ${num} Minutes`;
    }
</script>

<div class="max-w-4xl mx-auto p-8">
    <h1 class="text-3xl font-bold text-white mb-8">User Profile</h1>

    <Card.Root class="bg-zinc-900 border-zinc-800 shadow-xl">
        <Card.Header>
            <Card.Title class="text-xl text-zinc-100 flex items-center gap-2">
                <span class="w-1 h-6 bg-red-600 rounded-full"></span>
                Game Settings
            </Card.Title>
            <Card.Description>
                Control how often interactive learning challenges appear during playback.
            </Card.Description>
        </Card.Header>
        <Card.Content>
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
                class="space-y-6"
            >
                <div class="space-y-2">
                    <label class="text-sm font-medium text-zinc-300" for="gameInterval">
                        Game Interrupt Interval
                    </label>
                    <input type="hidden" name="gameInterval" value={gameInterval} />
                    <Select.Root type="single" bind:value={gameInterval}>
                        <Select.Trigger class="w-full max-w-xs bg-black/50 border-zinc-700 text-white">
                            {getIntervalLabel(gameInterval)}
                        </Select.Trigger>
                        <Select.Content class="bg-zinc-900 border-zinc-700 text-white">
                            <Select.Item value="0">Off (Netflix Mode)</Select.Item>
                            <Select.Item value="5">Every 5 Minutes</Select.Item>
                            <Select.Item value="10">Every 10 Minutes</Select.Item>
                            <Select.Item value="20">Every 20 Minutes</Select.Item>
                        </Select.Content>
                    </Select.Root>
                    {#if form?.errors?.gameInterval}
                        <p class="text-sm text-red-500">{form.errors.gameInterval[0]}</p>
                    {/if}
                </div>

                <Button type="submit" disabled={isSubmitting} class="bg-red-600 hover:bg-red-700 text-white font-bold px-8">
                    {isSubmitting ? "Saving..." : "Save Settings"}
                </Button>
            </form>

            {#if form?.success}
                <div class="mt-6 p-4 bg-green-900/20 border border-green-900/50 text-green-400 rounded-lg flex items-center gap-2">
                    <CheckCircle2 class="h-5 w-5" />
                    Settings saved successfully!
                </div>
            {/if}
        </Card.Content>
    </Card.Root>
</div>