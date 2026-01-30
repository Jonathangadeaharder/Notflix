<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import {
        Search,
        Trash2,
        ChevronLeft,
        ChevronRight,
        BookOpen,
    } from "lucide-svelte";
    import { goto, invalidate } from "$app/navigation";
    import { page } from "$app/stores";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    let searchInput = $derived(data.filters.search ?? "");
    let isDeleting = $state<string | null>(null);

    const levels = ["A1", "A2", "B1", "B2", "C1", "C2", "untracked"] as const;

    const levelColors: Record<string, string> = {
        A1: "bg-green-600",
        A2: "bg-green-500",
        B1: "bg-yellow-600",
        B2: "bg-yellow-500",
        C1: "bg-orange-600",
        C2: "bg-red-600",
        untracked: "bg-zinc-600",
    };

    const levelLabels: Record<string, string> = {
        A1: "A1 (Beginner)",
        A2: "A2 (Elementary)",
        B1: "B1 (Intermediate)",
        B2: "B2 (Upper Int.)",
        C1: "C1 (Advanced)",
        C2: "C2 (Proficient)",
        untracked: "Untracked",
    };

    function setFilter(key: string, value: string | null) {
        const url = new URL($page.url);
        if (value) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
        // Reset to page 1 when filter changes
        if (key !== "page") {
            url.searchParams.set("page", "1");
        }
        goto(url.toString(), { replaceState: true, invalidateAll: true });
    }

    function handleSearch() {
        setFilter("search", searchInput || null);
    }

    function clearSearch() {
        searchInput = "";
        setFilter("search", null);
    }

    async function deleteWord(lemma: string, lang: string) {
        isDeleting = lemma;
        try {
            const response = await fetch("/api/words/known", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lemma, lang }),
            });
            if (response.ok) {
                invalidate("app:vocabulary");
                // Refresh the page data
                goto($page.url.toString(), {
                    replaceState: true,
                    invalidateAll: true,
                });
            }
        } catch (e) {
            console.error("Failed to delete word:", e);
        } finally {
            isDeleting = null;
        }
    }

    function goToPage(newPage: number) {
        setFilter("page", newPage.toString());
    }
</script>

<svelte:head>
    <title>Vocabulary Library | Notflix</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-4 sm:p-8">
    <div class="flex items-center gap-3 mb-8">
        <div class="bg-red-600 p-2 rounded-lg">
            <BookOpen class="h-6 w-6 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-white">Vocabulary Library</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Sidebar with level filters -->
        <div class="lg:col-span-1">
            <Card.Root class="bg-zinc-900 border-zinc-800">
                <Card.Header class="pb-3">
                    <Card.Title class="text-lg text-zinc-100">Levels</Card.Title
                    >
                </Card.Header>
                <Card.Content class="space-y-1">
                    <button
                        onclick={() => setFilter("level", null)}
                        class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all {!data
                            .filters.level
                            ? 'bg-red-600 text-white'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}"
                    >
                        <span>All Words</span>
                        <Badge variant="secondary" class="bg-zinc-700">
                            {Object.values(data.levelCounts).reduce(
                                (a, b) => a + b,
                                0,
                            )}
                        </Badge>
                    </button>
                    {#each levels as level (level)}
                        <button
                            onclick={() => setFilter("level", level)}
                            class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all {data
                                .filters.level === level
                                ? 'bg-red-600 text-white'
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}"
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="w-2 h-2 rounded-full {levelColors[
                                        level
                                    ]}"
                                ></span>
                                <span>{levelLabels[level]}</span>
                            </div>
                            <Badge variant="secondary" class="bg-zinc-700">
                                {data.levelCounts[level]}
                            </Badge>
                        </button>
                    {/each}
                </Card.Content>
            </Card.Root>
        </div>

        <!-- Main content -->
        <div class="lg:col-span-3 space-y-4">
            <!-- Search bar -->
            <Card.Root class="bg-zinc-900 border-zinc-800">
                <Card.Content class="p-4">
                    <div class="flex gap-2">
                        <div class="relative flex-1">
                            <Search
                                class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                            />
                            <Input
                                type="text"
                                placeholder="Search words..."
                                bind:value={searchInput}
                                onkeydown={(e: KeyboardEvent) =>
                                    e.key === "Enter" && handleSearch()}
                                class="pl-10 bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                        </div>
                        <Button
                            onclick={handleSearch}
                            class="bg-red-600 hover:bg-red-700"
                        >
                            Search
                        </Button>
                        {#if data.filters.search}
                            <Button
                                onclick={clearSearch}
                                variant="outline"
                                class="border-zinc-700 text-zinc-400 hover:text-white"
                            >
                                Clear
                            </Button>
                        {/if}
                    </div>
                </Card.Content>
            </Card.Root>

            <!-- Words list -->
            <Card.Root class="bg-zinc-900 border-zinc-800">
                <Card.Header class="border-b border-zinc-800">
                    <div class="flex items-center justify-between">
                        <Card.Title class="text-lg text-zinc-100">
                            {data.pagination.total} words
                            {#if data.filters.level}
                                in {levelLabels[data.filters.level]}
                            {/if}
                            {#if data.filters.search}
                                matching "{data.filters.search}"
                            {/if}
                        </Card.Title>
                    </div>
                </Card.Header>
                <Card.Content class="p-0">
                    {#if data.words.length === 0}
                        <div class="p-8 text-center text-zinc-500">
                            <BookOpen
                                class="h-12 w-12 mx-auto mb-4 opacity-50"
                            />
                            <p>No words found.</p>
                            <p class="text-sm mt-1">
                                Start watching videos to build your vocabulary!
                            </p>
                        </div>
                    {:else}
                        <div class="divide-y divide-zinc-800">
                            {#each data.words as word (word.lemma)}
                                <div
                                    class="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors group"
                                >
                                    <div class="flex items-center gap-3">
                                        <span
                                            class="w-2 h-2 rounded-full {levelColors[
                                                word.level ?? 'untracked'
                                            ]}"
                                        ></span>
                                        <span class="text-white font-medium"
                                            >{word.lemma}</span
                                        >
                                        {#if word.isProperNoun}
                                            <Badge
                                                variant="outline"
                                                class="text-xs border-zinc-700 text-zinc-500"
                                            >
                                                Proper Noun
                                            </Badge>
                                        {/if}
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <Badge
                                            class="{levelColors[
                                                word.level ?? 'untracked'
                                            ]} text-white text-xs"
                                        >
                                            {word.level ?? "Untracked"}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={isDeleting === word.lemma}
                                            onclick={() =>
                                                deleteWord(
                                                    word.lemma,
                                                    word.lang,
                                                )}
                                            class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 hover:bg-red-950/50 transition-all"
                                            title="Remove from known words"
                                        >
                                            <Trash2 class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </Card.Content>

                <!-- Pagination -->
                {#if data.pagination.totalPages > 1}
                    <div
                        class="border-t border-zinc-800 p-4 flex items-center justify-between"
                    >
                        <span class="text-sm text-zinc-500">
                            Page {data.pagination.page} of {data.pagination
                                .totalPages}
                        </span>
                        <div class="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={data.pagination.page <= 1}
                                onclick={() =>
                                    goToPage(data.pagination.page - 1)}
                                class="border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-50"
                            >
                                <ChevronLeft class="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={data.pagination.page >=
                                    data.pagination.totalPages}
                                onclick={() =>
                                    goToPage(data.pagination.page + 1)}
                                class="border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-50"
                            >
                                Next
                                <ChevronRight class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                {/if}
            </Card.Root>
        </div>
    </div>
</div>
