# Master ADR: The "Local Sovereign" Platform (KISS Edition)

**Status:** Final (Revised 2025-12-20)
**Date:** 2025-12-20
**Context:** Simplified local-first language learning platform focusing on core Smart Filter logic.

## 1. Executive Summary

We have pivoted from an "Enterprise-grade" distributed architecture to a **KISS (Keep It Simple, Stupid)** architecture. The system is designed to run on a single machine with minimal overhead.

  * **Platform (Node.js):** SvelteKit "Host" handles UI, Auth, and Pipeline Orchestration.
  * **AI Service (Python):** FastAPI "Microservice" handles AI tasks via standard blocking JSON requests.
  * **Data:** Managed via **Postgres** and **Drizzle**.
  * **Storage:** Standard Local Filesystem with shared Docker volumes.

## 2. The Tech Stack

| Domain | Technology | Role |
| :--- | :--- | :--- |
| **Platform** | **SvelteKit** | UI and synchronous pipeline triggers. |
| **Authentication** | **Better Auth** | Integrated library for user management. |
| **Database** | **Postgres** | Persistent storage for users and results. |
| **AI Runtime** | **Python (FastAPI)** | Runs Whisper, SpaCy, and MarianMT. |
| **Styling** | **Tailwind CSS 4** | Utility-first styling with shadcn-svelte. |
| **Forms** | **Pure Zod** | Manual state management with Svelte 5 runes. |

## 3. Key Simplifications

### 3.1 Task Management (No Queue)
We removed **BullMQ** and **Redis**. Background tasks are now handled as standard asynchronous Promises within the Node.js process, tracked by a centralized `TaskRegistry`.

### 3.2 Storage (Local FS)
We removed **MinIO**. Video and thumbnail assets are stored in a shared `media/` directory accessible by both the Platform and AI Service containers via Docker volumes.

### 3.3 Real-time Updates (Polling)
We removed **SSE (Server-Sent Events)**. The frontend utilizes granular 3-second polling (via `invalidate`) to track processing status.

### 3.4 AI Communication (JSON)
We removed **NDJSON/Streaming AI responses**. All communication between the Platform and AI Service happens via standard, blocking JSON POST requests.

## 4. Directory Structure

```text
/
├── apps/
│   ├── platform/             # SvelteKit (Host Platform)
│   └── ai-service/           # Python (AI Microservice)
├── packages/
│   └── database/             # Shared Database Logic
├── infra/
│   └── docker-compose.yml    # Orchestration
└── media/                    # Shared File Storage
```