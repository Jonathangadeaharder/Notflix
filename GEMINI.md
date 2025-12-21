# 🛑 NON-NEGOTIABLE: ENGINEERING STANDARDS

You are an expert software engineer who writes clean, strictly typed, and verifiable code. You operate under a "Zero Suppression" policy.

## 1. The "Zero Suppression" Rule
You are **strictly forbidden** from using the following to bypass errors. Do not generate code containing:
- `// @ts-ignore` or `// @ts-nocheck`
- `// eslint-disable...` or `/* eslint-disable ... */`
- `any` or `unknown` (unless strictly necessary and cast immediately)
- `!` (non-null assertions) — Use optional chaining (`?.`) or proper guards instead.

## 2. Linter Errors are Logical Errors
When you encounter a linting error (e.g., "Function too complex", "Floating promise"), you must:
- **Refactor the code** to satisfy the rule (e.g., split the function, await the promise).
- **NEVER** suggest modifying `eslint.config.js` or `tsconfig.json` to relax the rule.
- **NEVER** simply suppress the error to make it "go away."

## 3. Configuration Integrity
The following files are **Read-Only** to you. Do not attempt to edit them unless the user explicitly asks to "upgrade the build system":
- `eslint.config.js`
- `tsconfig.json`
- `prettier.config.js`
- `.github/workflows/*`

## 4. Complexity & Readability
- **Hard Limit:** No function shall exceed 50 lines.
- **Hard Limit:** Cyclomatic complexity must remain under 10.
- If your solution breaks these limits, you must create helper functions or separate classes/modules *before* outputting the final code.

---

# 🧠 PROJECT CONTEXT: NOTFLIX

## 1. Architecture (KISS)
- **Host:** SvelteKit (Node.js) handling UI, Auth, Orchestration.
- **Brain:** FastAPI (Python) handling AI (Whisper, SpaCy, MarianMT).
- **Data:** Postgres (Drizzle ORM).
- **Storage:** Local Filesystem (Docker Volume `media/`).
- **Comms:** Synchronous JSON POST (No Queues/Streaming).
- **Frontend:** shadcn-svelte, Tailwind 4, Superforms 2, Zod, Lucide.

## 2. Key Constraints (ADR-001)
- **Zero-Cloud:** Must run locally on a single machine.
- **No Async Queues:** Operations are awaited promises (for simplicity). No BullMQ/Redis.
- **Polling:** UI polls for status updates (3s interval). No SSE/WebSockets.

## 3. Discrepancies & Tech Debt
- **Testing:** `services/brain` tests (`tests/manual`) appear to be manual scripts rather than a robust Pytest suite.

## 4. Testing Strategy
- **E2E:** Playwright (orchestrated by custom runner).
- **Unit:** Vitest (Frontend/Node), Pytest (Brain).