# Frontend Stack Standard

**Status:** Active
**Purpose:** Capture current platform frontend conventions without treating day-to-day stack choices as ADR-level architecture.

## 1. Current Stack

- **Framework:** SvelteKit
- **Reactive model:** Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **UI primitives:** `shadcn-svelte` source components in `src/lib/components/ui`
- **Styling:** Tailwind CSS
- **Validation:** Zod
- **Icons:** `lucide-svelte`

## 2. Conventions

- Prefer `resolve(...)` for internal navigation targets in Svelte templates.
- Add or update shared UI primitives through the local `shadcn-svelte` source component layer instead of introducing a second component library.
- Prefer Tailwind utility classes in markup; use component-local `<style>` blocks only when markup-level styling is not enough.
- Form validation should live on the server boundary, with client state modeled explicitly in Svelte rather than hidden behind heavy abstraction.
- Canonical runtime labels such as processing stages or status names must come from the functional/schema specs rather than being redefined in design or UI docs.

## 3. Scope

This document is normative for frontend conventions. It is not an architecture record and may evolve more frequently than the ADR set.
