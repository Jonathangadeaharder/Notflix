<script lang="ts">
    /* eslint-disable svelte/no-navigation-without-resolve */
    import { onMount } from "svelte";
    import { base } from "$app/paths";
    import { Button } from "$lib/components/ui/button";
    import { Plus, Play, RotateCw, Video } from "lucide-svelte";
    import { Badge } from "$lib/components/ui/badge";
    import * as Card from "$lib/components/ui/card";
    import { enhance } from "$app/forms";
    import { invalidate } from "$app/navigation";

    let { data } = $props();

    const POLLING_INTERVAL_MS = 3000;

    onMount(() => {
        const interval = setInterval(async () => {
            if (document.visibilityState !== "visible") return;

            // Only poll if there are pending videos
            const hasPending = data.videos.some(
                (v) => v.status === "PENDING" || !v.status,
            );
            if (hasPending) {
                await invalidate("app:videos");
            }
        }, POLLING_INTERVAL_MS);

        return () => clearInterval(interval);
    });

    function getStatusVariant(
        status: string | null,
    ): "default" | "secondary" | "destructive" | "outline" {
        if (status === "COMPLETED") return "default";
        if (status === "ERROR") return "destructive";
        if (status === "PENDING") return "secondary";
        return "outline";
    }
</script>

<div class="p-8 max-w-7xl mx-auto min-h-screen">
    <div class="flex justify-between items-end mb-8">
        <div>
            <h1 class="text-4xl font-bold text-white tracking-tight mb-2">
                Creator Studio
            </h1>
            <p class="text-zinc-400">
                Manage and upload your AI-generated content.
            </p>
        </div>
        <Button
            href="{base}/studio/upload"
            class="bg-white text-black hover:bg-zinc-200 rounded-full font-bold"
            data-testid="upload-link"
        >
            <Plus class="mr-2 h-5 w-5" />
            Upload New Video
        </Button>
    </div>

    <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
        {#each data.videos as video (video.id)}
            <Card.Root
                class="group bg-zinc-900/50 border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 overflow-hidden"
                data-testid="video-item"
            >
                <a
                    href="{base}/watch/{video.id}"
                    class="block aspect-video bg-black relative overflow-hidden"
                >
                    {#if video.thumbnailPath}
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <img
                            src={video.thumbnailPath}
                            class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                    {:else}
                        <div
                            class="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-zinc-900"
                        >
                            <Video class="w-12 h-12 mb-2 opacity-50" />
                            <span
                                class="text-xs font-medium uppercase tracking-wider"
                                >No Thumbnail</span
                            >
                        </div>
                    {/if}

                    <div class="absolute top-2 right-2">
                        <Badge
                            variant={getStatusVariant(video.status)}
                            data-testid="status-badge"
                        >
                            {video.status || "UNPROCESSED"}
                        </Badge>
                    </div>

                    <div
                        class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <div
                            class="bg-white text-black p-3 rounded-full transform scale-75 group-hover:scale-100 transition-transform"
                        >
                            <Play class="w-6 h-6 fill-current" />
                        </div>
                    </div>
                </a>
                <Card.Header class="p-5 pb-0">
                    <Card.Title class="text-lg truncate"
                        >{video.title}</Card.Title
                    >
                    <Card.Description class="text-xs text-zinc-500">
                        Uploaded on {new Date(
                            video.createdAt,
                        ).toLocaleDateString()}
                    </Card.Description>
                </Card.Header>
                <Card.Content
                    class="p-5 pt-4 mt-2 border-t border-white/5 flex items-center justify-between"
                >
                    <Button
                        variant="link"
                        href="{base}/watch/{video.id}"
                        class="p-0 h-auto text-xs font-bold text-white hover:text-red-500 uppercase tracking-wider"
                    >
                        Watch Now
                    </Button>
                    {#if !video.status || video.status === "ERROR"}
                        <form
                            method="POST"
                            action="{base}/studio?/reprocess"
                            use:enhance
                        >
                            <input type="hidden" name="id" value={video.id} />
                            <Button
                                type="submit"
                                variant="ghost"
                                class="h-auto p-0 text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider hover:bg-transparent"
                            >
                                <RotateCw class="mr-1 h-3 w-3" />
                                Retry
                            </Button>
                        </form>
                    {/if}
                </Card.Content>
            </Card.Root>
        {/each}

        {#if data.videos.length === 0}
            <div
                class="col-span-full py-32 text-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20"
            >
                <div
                    class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4 text-zinc-500"
                >
                    <Video class="w-8 h-8" />
                </div>
                <h3 class="text-xl font-bold text-white mb-2">
                    No content yet
                </h3>
                <p class="text-zinc-500 mb-6 max-w-sm mx-auto">
                    Upload your first video to start building your AI-generated
                    library.
                </p>
                <Button
                    href="{base}/studio/upload"
                    class="bg-red-600 hover:bg-red-700 text-white rounded-full font-bold"
                >
                    Upload Video
                </Button>
            </div>
        {/if}
    </div>
</div>
