<script lang="ts">
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import { AlertTriangle, Home, ArrowLeft } from "lucide-svelte";
</script>

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
  <div class="text-center max-w-lg mx-auto">
    <div
      class="inline-flex items-center justify-center p-4 bg-magenta-600/10 rounded-full mb-6"
    >
      <AlertTriangle class="h-12 w-12 text-magenta-500" />
    </div>

    <h1 class="text-6xl font-extrabold text-white mb-2 tracking-tighter">
      {page.status}
    </h1>

    <p class="text-xl text-zinc-400 mb-8">
      {#if page.status === 404}
        The page you're looking for doesn't exist or has been moved.
      {:else}
        Something went wrong on our end. Please try again later.
      {/if}
    </p>

    {#if page.error?.message}
      <div
        class="mb-8 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-500 font-mono"
      >
        {page.error.message}
      </div>
    {/if}

    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <Button
        href="{base}/"
        class="bg-magenta-600 hover:bg-magenta-700 text-white font-bold w-full sm:w-auto"
      >
        <Home class="h-4 w-4 mr-2" />
        Back to Home
      </Button>
      <Button
        variant="outline"
        class="border-zinc-700 text-zinc-300 hover:bg-zinc-800 w-full sm:w-auto"
        onclick={() => history.back()}
      >
        <ArrowLeft class="h-4 w-4 mr-2" />
        Go Back
      </Button>
    </div>
  </div>
</div>
