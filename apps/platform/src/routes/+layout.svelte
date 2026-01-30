<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";
	import { Clapperboard, User, LayoutGrid, X, Menu } from "lucide-svelte";
	import { base } from "$app/paths";

	let { children } = $props();
	let mobileMenuOpen = $state(false);

	function toggleMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMenu() {
		mobileMenuOpen = false;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div
	class="min-h-screen bg-neutral-950 text-white font-sans selection:bg-red-900 selection:text-white"
>
	<nav
		class="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300"
	>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-8">
					<a href="{base}/" class="flex items-center gap-2 group">
						<div
							class="bg-red-600 p-1 rounded transform group-hover:rotate-12 transition-transform duration-300"
						>
							<Clapperboard
								class="h-6 w-6 text-white fill-current"
							/>
						</div>
						<span
							class="text-white font-bold text-xl tracking-tight group-hover:text-red-500 transition-colors"
							>NOTFLIX</span
						>
					</a>
					<div class="hidden md:flex items-center space-x-1">
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

				<!-- Mobile menu button -->
				<div class="md:hidden">
					<button
						class="text-zinc-400 hover:text-white p-2"
						onclick={toggleMenu}
						aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
					>
						{#if mobileMenuOpen}
							<X class="h-6 w-6" />
						{:else}
							<Menu class="h-6 w-6" />
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Mobile menu dropdown -->
		{#if mobileMenuOpen}
			<div
				class="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-xl"
			>
				<div class="px-4 py-4 space-y-2">
					<a
						href="{base}/studio"
						onclick={closeMenu}
						class="flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 px-4 py-3 rounded-lg text-base font-medium transition-all"
					>
						<LayoutGrid class="h-5 w-5" />
						Studio
					</a>
					<a
						href="{base}/profile"
						onclick={closeMenu}
						class="flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-white/5 px-4 py-3 rounded-lg text-base font-medium transition-all"
					>
						<User class="h-5 w-5" />
						Profile
					</a>
				</div>
			</div>
		{/if}
	</nav>

	<main class="relative z-0">
		{@render children()}
	</main>
</div>
