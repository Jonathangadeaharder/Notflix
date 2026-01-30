# Component Specifications

Reusable UI components for the Notflix design system.

---

## Navigation

### Top Navigation Bar

**Dimensions**: Full width × 64px height

**Structure**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]  NOTFLIX          [Studio]  [Profile]              [Menu]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Specs**:
- Background: `bg-black/50` with `backdrop-blur-xl`
- Border: `border-b border-white/5`
- Position: Sticky, `top-0`, `z-50`
- Max width: `max-w-7xl` centered
- Padding: `px-4 sm:px-6 lg:px-8`

**Logo**:
- Icon: Clapperboard in red square (`bg-red-600`, `rounded`, `p-1`)
- Text: "NOTFLIX" - `font-bold text-xl tracking-tight`
- Hover: Icon rotates 12°, text turns red

**Nav Links**:
- Style: `text-zinc-400 hover:text-white`
- Padding: `px-3 py-2 rounded-full`
- Icon: 16×16px, left of text
- Gap: `gap-2` between icon and text

**Mobile Menu** (< 768px):
- Hamburger icon toggles dropdown
- Full-width dropdown with `bg-black/95 backdrop-blur-xl`
- Links stack vertically with `py-3 px-4`

---

## Buttons

### Primary Button

**Variants**:

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Default | `bg-white` | `text-black` | none |
| Brand | `bg-red-600` | `text-white` | none |
| Ghost | `bg-white/10` | `text-white` | none |
| Outline | transparent | `text-zinc-300` | `border-zinc-700` |

**Sizes**:

| Size | Padding | Font | Height |
|------|---------|------|--------|
| sm | `px-4 py-2` | 14px | 32px |
| md | `px-6 py-3` | 16px | 44px |
| lg | `px-8 py-4` | 18px | 52px |

**States**:
- Default: Base styles
- Hover: Slight background shift (`hover:bg-zinc-200` for white)
- Active: Scale down slightly
- Disabled: `opacity-50 cursor-not-allowed`
- Loading: Spinner icon + "Processing..." text

**Shape**: `rounded-full` (pill shape)

### Icon Button

**Specs**:
- Size: 40×40px (default), 32×32px (small)
- Shape: `rounded-full`
- Icon size: 20×20px (default), 16×16px (small)
- Background: `bg-white` (play) or `border border-zinc-500` (secondary)

---

## Cards

### Video Card

**Dimensions**: Flexible width, 2:3 aspect ratio

**Structure**:
```
┌──────────────────────┐
│                      │
│    [Thumbnail]       │  ← aspect-[2/3]
│                      │
│   [Number Badge]     │
│                      │
├──────────────────────┤
│ [Title]              │  ← Hover overlay
│ • Category           │
│ [Play] [Add]         │
└──────────────────────┘
```

**Specs**:
- Background: `bg-zinc-900`
- Border: `border border-white/5`
- Radius: `rounded-lg`
- Overflow: `overflow-hidden`

**Hover State**:
- Border: `border-white/20`
- Scale: `scale-105`
- Shadow: `shadow-2xl shadow-red-900/20`
- Z-index: `z-10`
- Overlay gradient fades in from bottom

**Content (on hover)**:
- Title: `font-bold text-lg text-white`
- Category: `text-xs text-zinc-300` with red dot indicator
- Action buttons: Play (filled) + Add (outline)

---

### Studio Video Card

**Dimensions**: Responsive grid item

**Structure**:
```
┌──────────────────────────┐
│  ┌────────────────────┐  │
│  │   [Thumbnail]      │  │  ← 16:9 aspect
│  │          [Badge]   │  │
│  │      [Play Icon]   │  │  ← Hover overlay
│  └────────────────────┘  │
│  [Title]                 │
│  Uploaded on [Date]      │
│  ─────────────────────   │
│  [Watch Now]    [Retry]  │
└──────────────────────────┘
```

**Specs**:
- Background: `bg-zinc-900/50`
- Border: `border-white/5 hover:border-white/20`
- Hover: `-translate-y-1` lift effect

**Status Badge**:
| Status | Variant | Color |
|--------|---------|-------|
| COMPLETED | default | Green |
| PENDING | secondary | Gray |
| ERROR | destructive | Red |
| UNPROCESSED | outline | Outline |

---

### Settings Card

**Specs**:
- Background: `bg-zinc-900`
- Border: `border-zinc-800`
- Shadow: `shadow-xl`
- Padding: Header `p-6`, Content `p-6`

**Header**:
- Title bar with red accent line (`w-1 h-6 bg-red-600 rounded-full`)
- Title: `text-xl text-zinc-100`
- Description: Default muted text

---

## Form Elements

### Text Input

**Specs**:
- Height: 44px
- Background: `bg-black/50`
- Border: `border border-zinc-700`
- Radius: `rounded-md`
- Padding: `px-3 py-2`
- Text: `text-white`

**States**:
- Focus: `ring-2 ring-red-600 border-transparent`
- Error: `border-red-500`
- Disabled: `opacity-50`

**Label**:
- Style: `text-sm font-medium text-zinc-300`
- Margin: `mb-2`

### Select / Dropdown

**Trigger**:
- Same styling as text input
- Chevron icon on right

**Content**:
- Background: `bg-zinc-900`
- Border: `border-zinc-700`
- Items: `hover:bg-zinc-800`

---

## Badges

**Sizes**:
| Size | Padding | Font |
|------|---------|------|
| sm | `px-2 py-0.5` | 10px |
| md | `px-2.5 py-0.5` | 12px |

**Variants**:
| Variant | Background | Text |
|---------|------------|------|
| default | `bg-green-600` | white |
| secondary | `bg-zinc-700` | `text-zinc-300` |
| destructive | `bg-red-600` | white |
| outline | transparent | `text-zinc-400` + border |

---

## Hero Section

**Dimensions**: 70vh height, full width

**Background**:
- Gradient overlay: `bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent`
- Radial glow: `bg-[radial-gradient(ellipse_at_center,...)] from-red-900/20 via-neutral-950 to-neutral-950`

**Content** (centered):
- Tag: Pill badge with `bg-red-500/10 text-red-500 border-red-500/20`
- Headline: `text-5xl md:text-7xl font-extrabold tracking-tighter`
- Gradient text: `bg-gradient-to-r from-red-500 to-orange-500` with `bg-clip-text text-transparent`
- Subheading: `text-lg md:text-xl text-zinc-400`
- CTA buttons: Primary (white) + Secondary (glass)

---

## Feedback States

### Success Message

```
┌─────────────────────────────────────────┐
│ ✓  Settings saved successfully!         │
└─────────────────────────────────────────┘
```

- Background: `bg-green-900/20`
- Border: `border-green-900/50`
- Text: `text-green-400`
- Icon: CheckCircle

### Error Message

```
┌─────────────────────────────────────────┐
│ ⚠  [Error message text]                 │
└─────────────────────────────────────────┘
```

- Background: `bg-red-900/30`
- Border: `border-red-900/50`
- Text: `text-red-500`

---

## Empty States

**Structure**:
```
┌─────────────────────────────────────────┐
│                                         │
│              [Icon]                     │
│          No content yet                 │
│    Upload your first video to start    │
│         [Upload Video]                  │
│                                         │
└─────────────────────────────────────────┘
```

**Specs**:
- Border: `border-2 border-dashed border-zinc-800`
- Background: `bg-zinc-900/20`
- Radius: `rounded-2xl`
- Padding: `py-32`
- Icon container: `w-16 h-16 rounded-full bg-zinc-800 text-zinc-500`
