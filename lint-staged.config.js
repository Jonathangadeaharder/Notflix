// Function-based config to handle:
//   1. Spaces in the project path ("Coding Projects")
//   2. SvelteKit + prefixed filenames (+page.svelte, +layout.svelte, etc.)
//
// Both ESLint 9 and Prettier pass file arguments through their glob engines,
// where + is treated as an extglob quantifier and fails to match real files.
//
// Fixes:
//   - ESLint: pass paths relative to the package root via --filter so pnpm
//     runs eslint from the package directory (e.g. src/routes/+page.svelte)
//   - Prettier: pass a directory glob; prettier expands it internally and
//     has no trouble finding + prefixed files that way
import path from 'path';

const root = process.cwd();

// Paths relative to a given package dir — safe for ESLint's file resolution
const relTo = (dir, files) =>
  files.map((f) => JSON.stringify(path.relative(path.join(root, dir), f))).join(' ');

// Quoted absolute paths — kept for tools that handle them correctly (ruff)
const abs = (files) => files.map((f) => JSON.stringify(f)).join(' ');

export default {
  'apps/platform/**/*.{ts,svelte}': (files) => [
    `pnpm --filter @notflix/platform exec eslint --fix ${relTo('apps/platform', files)}`,
    `pnpm exec prettier --write "apps/platform/src/**/*.{ts,svelte}"`,
  ],
  'apps/ai-service/**/*.py': (files) => [
    `uvx --from ruff ruff check --fix ${abs(files)}`,
    `uvx --from ruff ruff format ${abs(files)}`,
  ],
  'packages/database/**/*.ts': (files) => [
    `pnpm --filter @notflix/database exec eslint --fix ${relTo('packages/database', files)}`,
    `pnpm exec prettier --write "packages/database/**/*.ts"`,
  ],
  'packages/shared-types/**/*.ts': (files) => [
    `pnpm --filter @notflix/shared-types exec eslint --fix ${relTo('packages/shared-types', files)}`,
    `pnpm exec prettier --write "packages/shared-types/src/**/*.ts"`,
  ],
};
