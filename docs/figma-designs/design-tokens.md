# Design Tokens

Foundational design values for the Notflix design system.

---

## Colors

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `brand-primary` | `#dc2626` (red-600) | Primary buttons, links, highlights |
| `brand-primary-hover` | `#b91c1c` (red-700) | Primary button hover states |
| `brand-gradient` | `linear-gradient(to right, #ef4444, #f97316)` | Hero text gradient (red-500 → orange-500) |

### Background Colors

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#0a0a0a` (neutral-950) | Page background |
| `bg-surface` | `#18181b` (zinc-900) | Cards, panels |
| `bg-surface-hover` | `#27272a` (zinc-800) | Card hover states |
| `bg-elevated` | `#000000` | Navigation, modals |
| `bg-overlay` | `rgba(0,0,0,0.5)` | Modal backdrops, image overlays |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `text-primary` | `#ffffff` | Headings, important text |
| `text-secondary` | `#a1a1aa` (zinc-400) | Body text, descriptions |
| `text-muted` | `#71717a` (zinc-500) | Placeholder, disabled text |
| `text-inverse` | `#000000` | Text on light backgrounds |

### Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `border-default` | `rgba(255,255,255,0.05)` | Default borders |
| `border-hover` | `rgba(255,255,255,0.2)` | Hover state borders |
| `border-input` | `#3f3f46` (zinc-700) | Form input borders |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `status-success` | `#22c55e` (green-500) | Success states |
| `status-error` | `#ef4444` (red-500) | Error states |
| `status-warning` | `#eab308` (yellow-500) | Warning states |
| `status-info` | `#3b82f6` (blue-500) | Info states |

---

## Typography

### Font Family

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display-xl` | 64px (4rem) | 800 (extrabold) | 1.1 | Hero headlines |
| `display-lg` | 48px (3rem) | 700 (bold) | 1.2 | Page titles |
| `heading-xl` | 32px (2rem) | 700 (bold) | 1.3 | Section headers |
| `heading-lg` | 24px (1.5rem) | 600 (semibold) | 1.4 | Card titles |
| `heading-md` | 20px (1.25rem) | 600 (semibold) | 1.4 | Subsection headers |
| `body-lg` | 18px (1.125rem) | 400 (normal) | 1.6 | Lead paragraphs |
| `body-md` | 16px (1rem) | 400 (normal) | 1.5 | Body text |
| `body-sm` | 14px (0.875rem) | 500 (medium) | 1.5 | Secondary text |
| `caption` | 12px (0.75rem) | 500 (medium) | 1.4 | Labels, badges |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tracking-tight` | -0.025em | Headlines |
| `tracking-normal` | 0 | Body text |
| `tracking-wide` | 0.05em | Uppercase labels |

---

## Spacing

Based on a 4px grid system.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Icon gaps, tight padding |
| `space-3` | 12px | Button padding (vertical) |
| `space-4` | 16px | Card padding, form gaps |
| `space-5` | 20px | Section padding |
| `space-6` | 24px | Component gaps |
| `space-8` | 32px | Section margins |
| `space-10` | 40px | Large section gaps |
| `space-12` | 48px | Page section spacing |
| `space-16` | 64px | Hero section padding |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Badges, small elements |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards, panels |
| `radius-xl` | 16px | Large cards |
| `radius-2xl` | 24px | Hero sections |
| `radius-full` | 9999px | Pills, avatars, circular buttons |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle depth |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.4)` | Cards |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.5)` | Dropdowns, modals |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.6)` | Elevated cards |
| `shadow-glow` | `0 0 40px rgba(127,29,29,0.2)` | Red accent glow |

---

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `duration-fast` | 150ms | Micro-interactions |
| `duration-normal` | 300ms | Standard transitions |
| `duration-slow` | 500ms | Page transitions |
| `easing-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General easing |
| `easing-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `easing-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `z-base` | 0 | Default layer |
| `z-dropdown` | 10 | Dropdowns, tooltips |
| `z-sticky` | 20 | Sticky headers |
| `z-overlay` | 30 | Overlays, backdrops |
| `z-modal` | 40 | Modals, dialogs |
| `z-toast` | 50 | Toast notifications |
| `z-nav` | 50 | Fixed navigation |

---

## Breakpoints

| Token | Value | CSS Media Query |
|-------|-------|-----------------|
| `sm` | 640px | `@media (min-width: 640px)` |
| `md` | 768px | `@media (min-width: 768px)` |
| `lg` | 1024px | `@media (min-width: 1024px)` |
| `xl` | 1280px | `@media (min-width: 1280px)` |
| `2xl` | 1536px | `@media (min-width: 1536px)` |
