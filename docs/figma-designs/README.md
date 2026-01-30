# Notflix Design System

This folder contains the design specifications for the Notflix platform - an AI-powered language learning application styled like a streaming service.

## Design Documents

| Document | Description |
|----------|-------------|
| [Design Tokens](./design-tokens.md) | Colors, typography, spacing, and other foundational values |
| [Components](./components.md) | Reusable UI component specifications |
| [Pages](./pages.md) | Full page layout specifications |

## Design Philosophy

Notflix adopts a **dark, cinematic aesthetic** inspired by modern streaming platforms:

- **Dark Mode First**: Deep neutral backgrounds create focus on content
- **Red Accent**: Primary brand color for CTAs and highlights
- **Card-Based UI**: Content organized in hoverable, interactive cards
- **Glassmorphism**: Subtle blur effects on navigation and overlays
- **Micro-interactions**: Hover states, transitions, and feedback animations

## Tech Stack (for implementation)

- **Framework**: SvelteKit
- **Styling**: Tailwind CSS v4
- **Components**: shadcn-svelte (Radix-based)
- **Icons**: Lucide Icons
- **Fonts**: System fonts (Inter fallback)

## Quick Reference

### Brand Colors
- **Primary Red**: `#dc2626` (red-600)
- **Background**: `#0a0a0a` (neutral-950)
- **Surface**: `#18181b` (zinc-900)
- **Text Primary**: `#ffffff`
- **Text Muted**: `#a1a1aa` (zinc-400)

### Key Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

---

*Last updated: January 2026*
