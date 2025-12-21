# ADR-006: Frontend Stack (UI, Styling, Forms, and Icons)

**Status:** Accepted
**Date:** 2025-12-19
**Context:** Need for a consistent, type-safe, and highly productive frontend development environment for the Notflix web application.

## 1. Decision

We have adopted the following technologies for the frontend stack:

*   **UI Components:** [shadcn-svelte](https://shadcn-svelte.com/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Form Management:** Manual state management using [Svelte 5 Runes](https://svelte.dev/docs/svelte/runes) (`$state`, `$derived`, `$effect`).
*   **Validation:** [Zod](https://zod.dev/)
*   **Icons:** [Lucide Svelte](https://lucide.dev/guide/packages/lucide-svelte)

## 2. Rationale

### 2.1 shadcn-svelte & Tailwind CSS
*   **Ownership:** Unlike traditional component libraries (e.g., Carbon, Material UI), shadcn-svelte provides components as source code in our `lib/components/ui` directory. This allows for direct modification and avoids vendor lock-in.
*   **Svelte 5 Support:** We use the latest version compatible with Svelte 5 (Runes), ensuring future-proof architecture.
*   **Consistency:** Tailwind CSS is the industry standard for utility-first styling and is the foundation upon which shadcn is built.

### 2.2 Pure Zod & Svelte 5 Runes
*   **Simplicity:** We removed third-party form frameworks (e.g., Superforms) to reduce library-level conflicts (specifically Zod version mismatches) and "fighting the framework."
*   **Control:** Using `$state` for form data and `$effect` for prop synchronization provides fine-grained control over form behavior without magic abstractions.
*   **Type Safety:** End-to-end type safety is achieved by defining Zod schemas in `+page.server.ts` and using `z.infer<T>` to type the local state in `+page.svelte`.
*   **Validation:** Standard SvelteKit `fail(400, { errors })` responses are used to pass validation errors back to the UI.

### 2.3 Lucide Svelte
# ... (Lucide section remains same)

## 3. Implementation Standards

1.  **Component Installation:** Add new shadcn components using `npx shadcn-svelte@latest add <component>`.
2.  **Form Patterns:** 
    *   Define a Zod schema in `+page.server.ts`.
    *   Use `Object.fromEntries(await request.formData())` and `schema.safeParse` in server actions.
    *   Use `$state` in `+page.svelte` initialized from `data.initialData`.
    *   Use `$effect` to keep state in sync with server-provided updates if necessary.
3.  **Styling:** Custom styles should be implemented via Tailwind classes in the HTML template. Avoid `<style>` blocks in Svelte components unless strictly necessary.
4.  **Icons:** Always import icons from `lucide-svelte`.

## 4. Consequences

*   **Positive:** Zero dependency friction between Zod versions. Highly predictable state management using native Svelte 5 features. Reduced bundle size by removing form frameworks.
*   **Negative:** More manual boilerplate for handling error messages and submission states compared to a full-featured framework.
