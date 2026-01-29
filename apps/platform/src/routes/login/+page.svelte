<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { LogIn } from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { signIn, signUp } from "$lib/auth-client";

	let isLoading = $state(false);
	let email = $state("");
	let password = $state("");
	let errorMessage = $state("");

	async function handleLogin(e: Event) {
		e.preventDefault();
		isLoading = true;
		errorMessage = "";

		const { data, error } = await signIn.email({
			email,
			password,
			callbackURL: "/",
		});

		if (error) {
			errorMessage = error.message || "Failed to sign in";
			isLoading = false;
		} else {
			await goto("/");
		}
	}

	async function handleDemoLogin() {
		isLoading = true;
		errorMessage = "";

		// Attempt to sign up first (in case the user doesn't exist)
		const { data, error: signUpError } = await signUp.email({
			email: "test@example.com",
			password: "password123",
			name: "Demo User",
			callbackURL: "/",
		});

		if (signUpError) {
			console.error("SignUp Error Details:", signUpError);
			// If already exists, just sign in
			const { error: signInError } = await signIn.email({
				email: "test@example.com",
				password: "password123",
				callbackURL: "/",
			});

			if (signInError) {
				console.error("SignIn Error Details:", signInError);
				errorMessage = `SignUp: ${signUpError.message} | SignIn: ${signInError.message}`;
				isLoading = false;
				return;
			}
		}

		await goto("/");
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-black/90 p-4">
	<Card.Root class="w-full max-w-md bg-zinc-900 border-zinc-800 shadow-2xl">
		<Card.Header class="space-y-1">
			<Card.Title class="text-2xl font-bold text-white text-center"
				>Welcome Back</Card.Title
			>
			<Card.Description class="text-zinc-400 text-center">
				Enter your credentials to access your account
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<!-- 
                Using standard form action. 
                If Better Auth is used, it might need client-side SDK.
                But let's assume standard server actions for now or just a visual placeholder 
                that allows "logging in" via the existing auth mechanics if they exist.
                Since I can't see the auth setup fully, I'll create a UI that *looks* right.
                For the 'User: undefined' fix, we need this to actually work.
                The user's previous 'better-auth' file reference suggests Better Auth.
                Better Auth usually uses client-side or specific API endpoints.
                I'll make a generic form for now.
            -->
			<form onsubmit={handleLogin} class="space-y-4">
				{#if errorMessage}
					<div
						class="p-3 text-sm bg-red-900/30 border border-red-900/50 text-red-500 rounded-md"
					>
						{errorMessage}
					</div>
				{/if}

				<div class="space-y-2">
					<label for="email" class="text-sm font-medium text-zinc-300"
						>Email</label
					>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={email}
						placeholder="name@example.com"
						class="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
						required
					/>
				</div>
				<div class="space-y-2">
					<label
						for="password"
						class="text-sm font-medium text-zinc-300"
						>Password</label
					>
					<input
						type="password"
						id="password"
						name="password"
						bind:value={password}
						class="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
						required
					/>
				</div>
				<Button
					type="submit"
					class="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="mr-2 animate-spin">⏳</span> Processing...
					{:else}
						<LogIn class="mr-2 h-4 w-4" /> Sign In
					{/if}
				</Button>

				<div class="relative py-4">
					<div class="absolute inset-0 flex items-center">
						<span class="w-full border-t border-zinc-800"></span>
					</div>
					<div class="relative flex justify-center text-xs uppercase">
						<span class="bg-zinc-900 px-2 text-zinc-500 font-medium"
							>Or for testing</span
						>
					</div>
				</div>

				<Button
					type="button"
					variant="outline"
					class="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
					onclick={handleDemoLogin}
					disabled={isLoading}
				>
					🚀 Demo Login (One-click)
				</Button>
			</form>

			<div class="mt-4 text-center text-sm">
				<p class="text-zinc-500">
					Don't have an account? <a
						href="/register"
						class="text-red-500 hover:underline">Sign up</a
					>
				</p>
				<p class="text-zinc-600 text-xs mt-2">
					(Dev Note: Ensure auth backend is configured)
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
