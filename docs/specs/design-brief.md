# Design Brief & Prompt: Notflix Implementation

**Role:** Senior UI/UX Designer
**Project:** "Notflix" - A Local-First Language Learning Platform
**Aesthetic:** Premium Streaming Service (Netflix/HBO) meets Modern EdTech (Duolingo/Anki).

---

## 🚀 The Elevator Pitch

Imagine Netflix, but it pauses every 10 minutes to test you on vocabulary you _don't know yet_ from the upcoming scene. It's an immersive video player that filters out words you know and focuses purely on filling your "Knowledge Gaps."

---

## 🎨 Visual Identity & Mood

- **Theme:** **Strict Dark Mode**. Deep blacks (`#000000`, `#121212`) and dark grays. No white backgrounds.
- **Accent Colors:** Use semantic colors for "Knowledge State":
  - 🟢 **Known (Easy):** Subtle Green (or invisible).
  - 🟡 **Learning (Target):** Vibrant Amber/Gold (The focus).
  - 🔴 **Hard (Unknown):** Muted Red or Greyed out.
- **Typography:** Clean sans-serif (Inter, Geist, or Netflix Sans equivalent). High readability for subtitles is paramount.
- **Vibe:** Cinematic, immersive, distraction-free. The UI should fade away when not in use.

---

## 📱 Core Screens & Requirements

### 1. The "Cinema" Home (Dashboard)

- **Layout:** Classic streaming grid (Poster Art).
- **Hero Section:** "Continue Watching" with a progress bar and a "Knowledge Gap" indicator (e.g., "85% Known").
- **Metadata:** Instead of "Match %" (Netflix), show "Comprehension %" (e.g., "92% Comprehension").
- **Status Indicators:** Small badges for `PROCESSING`, `NEW`, `COMPLETED`.

### 2. The "Smart Player" (Video Interface)

- **Controls:** Minimalist custom video controls (Play, Pause, Scrub).
- **Subtitle Area:** This is critical.
  - Subtitles are NOT just text. They are interactive objects.
  - **Clickable Words:** Hovering a word pauses video and shows a mini-dictionary tooltip.
  - **Visual Filtering:** Words the user _knows_ might be dimmed subtly, while _unknown_ words are highlighted.
- **Sidebar/Drawer (optional):** A specialized "Script View" that shows the full transcript, searchable and interactive.

### 3. The "Game & Watch" Overlay (The Hook)

- **Trigger:** Happens automatically every X minutes.
- **UI:** A modal/overlay that **blocks** the video.
- **Content:** Flashcards for 3-5 words appearing in the _next_ segment.
- **Interaction:** Keyboard-first (Space to flip, 1-4 to rate).
- **Transition:** Smooth animation back to video upon completion. "Gap Filled, Resuming..."

### 4. The Studio (Upload & Manage)

- **Vibe:** Professional tool, clearer, more data-dense.
- **Features:** Drag-and-drop video upload zone.
- **Pipeline Visualization:** A step-by-step progress tracker for the AI pipeline:
  `Uploading` -> `Transcribing (Whisper)` -> `Analyzing (SpaCy)` -> `Ready`.

---

## 🧩 User Flows to Prototype

1.  **The Immersion Loop:**

    > User selects video -> Plays -> Subtitles show "Learning Words" highlighted -> User clicks a word to see definition -> Video Pauses -> "Add to Deck" animation -> Resume.

2.  **The "Paywall" (Game Loop):**
    > Video hits 10:00 mark -> Pauses -> "Knowledge Check" Overlay slides in -> User answers 3 cards -> Overlay slides out -> Video resumes.

---

## 📦 Deliverables

1.  **High-Fidelity Mockups** for Home, Player, Game Overlay, and Studio.
2.  **Interactive Prototype** demonstrating the "Hover-to-Pause" and "Game Overlay" transitions.
3.  **Design System:** Basic color structure, typography, and component library (Buttons, Cards, Badges).
