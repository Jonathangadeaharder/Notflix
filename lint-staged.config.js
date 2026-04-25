// Function-based config to handle:
//   1. Spaces in the project path ("Coding Projects")
//   2. SvelteKit + prefixed filenames (+page.svelte, +layout.svelte, etc.)
//
// Both ESLint 9 and Prettier pass file arguments through their glob engines,
// where + is treated as an extglob quantifier and fails to match real files.
//
// Biome handles these correctly without workarounds.

const abs = (files) => files.map((f) => JSON.stringify(f)).join(' ');

export default {
  'apps/platform/**/*.{ts,js,svelte}': (files) => [
    `pnpm exec biome check --write ${abs(files)}`,
  ],
  'apps/ai-service/**/*.py': (files) => [
    `uvx --from ruff ruff check --fix ${abs(files)}`,
    `uvx --from ruff ruff format ${abs(files)}`,
  ],
};
