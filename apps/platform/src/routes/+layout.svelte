<script lang="ts">
	import '../app.css';
	import favicon from "$lib/assets/favicon.svg";
	import { Clapperboard, User, LayoutGrid } from 'lucide-svelte';
	import { base } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-900 selection:text-white">
	<nav
		class="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300"
	>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-8">
					<a
						href="{base}/"
						class="flex items-center gap-2 group"
					>
						<div class="bg-red-600 p-1 rounded transform group-hover:rotate-12 transition-transform duration-300">
							<Clapperboard class="h-6 w-6 text-white fill-current" />
						</div>
						<span class="text-white font-bold text-xl tracking-tight group-hover:text-red-500 transition-colors">NOTFLIX</span>
					</a>
					<div
						class="hidden md:flex items-center space-x-1"
					>
						<a
							href="{base}/studio"
							class="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-full text-sm font-medium transition-all"
						>
							<LayoutGrid class="h-4 w-4" />
							Studio
						</a>
						<a
							href="{base}/profile"
							class="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-full text-sm font-medium transition-all"
						>
							<User class="h-4 w-4" />
							Profile
						</a>
					</div>
				</div>
				
				<!-- Mobile menu button placeholder -->
				<div class="md:hidden">
					<button class="text-zinc-400 hover:text-white">
						<span class="sr-only">Open menu</span>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</nav>

	<main class="relative z-0">
		{@render children()}
	</main>
</div>