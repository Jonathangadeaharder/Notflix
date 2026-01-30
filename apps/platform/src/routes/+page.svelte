<script lang="ts">
	import { Play, Info, Plus } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { base } from "$app/paths";

	// Placeholder data for the "Trending" section
	const TRENDING = [
		{ title: "Cyber Dreams", category: "Sci-Fi", color: "bg-blue-500" },
		{
			title: "The Last Algorithm",
			category: "Thriller",
			color: "bg-purple-500",
		},
		{ title: "Neon Nights", category: "Documentary", color: "bg-pink-500" },
		{ title: "Binary Love", category: "Romance", color: "bg-red-500" },
		{ title: "Zero Day", category: "Action", color: "bg-green-500" },
		{ title: "Cloud City", category: "Drama", color: "bg-yellow-500" },
	];

	async function handleStartWatching() {
		return await goto(`${base}/studio`);
	}

	function handleMoreInfo() {
		// Could open a modal or navigate to an about page
		alert(
			"Notflix is an AI-powered language learning platform. Upload videos and learn vocabulary through interactive subtitles!",
		);
	}
</script>

<div class="relative min-h-[calc(100vh-4rem)] flex flex-col">
	<!-- Hero Section -->
	<section
		class="relative h-[70vh] w-full flex items-center justify-center overflow-hidden"
	>
		<!-- Background Glow/Image Placeholder -->
		<div
			class="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent z-10"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-neutral-950 to-neutral-950 z-0"
		></div>

		<!-- Hero Content -->
		<div class="relative z-20 text-center max-w-4xl mx-auto px-4">
			<span
				class="inline-block py-1 px-3 rounded-full bg-red-500/10 text-red-500 text-xs font-bold tracking-wider mb-6 border border-red-500/20 uppercase"
			>
				AI-Powered Language Learning
			</span>
			<h1
				class="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-6 leading-tight"
			>
				Learn Languages, <br />
				<span
					class="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500"
					>Watch Content.</span
				>
			</h1>
			<h3 class="sr-only">Notflix - AI-Powered Entertainment</h3>
			<p class="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
				Upload your favorite videos and learn vocabulary through
				AI-generated interactive subtitles, tailored to your knowledge
				level.
			</p>

			<div
				class="flex flex-col sm:flex-row items-center justify-center gap-4"
			>
				<button
					onclick={handleStartWatching}
					class="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors w-full sm:w-auto justify-center cursor-pointer"
				>
					<Play class="h-5 w-5 fill-current" />
					Get Started
				</button>
				<button
					onclick={handleMoreInfo}
					class="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold hover:bg-white/20 transition-colors w-full sm:w-auto justify-center cursor-pointer"
				>
					<Info class="h-5 w-5" />
					More Info
				</button>
			</div>
		</div>
	</section>

	<!-- Trending Section -->
	<section class="px-4 sm:px-6 lg:px-8 -mt-20 relative z-30 pb-20">
		<h2 class="text-2xl font-bold text-white mb-6">Sample Content</h2>

		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
			{#each TRENDING as item, i (item.title)}
				<div
					class="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 cursor-pointer border border-white/5 hover:border-white/20 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-red-900/20 hover:z-10"
				>
					<!-- Image Placeholder -->
					<div
						class="absolute inset-0 {item.color} opacity-20 group-hover:opacity-30 transition-opacity"
					></div>
					<div
						class="absolute inset-0 flex items-center justify-center"
					>
						<span
							class="text-4xl font-black text-white/10 group-hover:text-white/30 transition-colors"
							>{i + 1}</span
						>
					</div>

					<!-- Hover Overlay -->
					<div
						class="absolute inset-0 bg-gradient-to-t from-black via-black/0 to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4"
					>
						<h3
							class="font-bold text-white text-lg leading-none mb-1"
						>
							{item.title}
						</h3>
						<p
							class="text-xs text-zinc-300 flex items-center gap-2"
						>
							<span class="w-1.5 h-1.5 rounded-full bg-red-500"
							></span>
							{item.category}
						</p>

						<div class="flex items-center gap-2 mt-3">
							<button
								onclick={() => {
									return goto(`${base}/studio`);
								}}
								class="p-2 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors"
							>
								<Play class="h-3 w-3 fill-current" />
							</button>
							<button
								class="p-2 rounded-full border border-zinc-500 text-white hover:bg-white/10 transition-colors"
							>
								<Plus class="h-3 w-3" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>
