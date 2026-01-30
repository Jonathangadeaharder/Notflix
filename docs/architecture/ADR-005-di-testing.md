# ADR 005: Dependency Injection & Confidence Testing

**Status:** Approved
**Date:** 2025-12-09
**Context:** Ensuring the system is testable, fast, and robust without loading 4GB AI models for every unit test.

## 1. The Strategy: "Ports and Adapters" (Hexagonal Architecture)

We define **Interfaces** (Ports) for all heavy infrastructure. The Application Logic only talks to these Interfaces, never to the concrete libraries directly.

- **Production:** We inject the **Real Adapter** (e.g., `FasterWhisperAdapter`).
- **Testing:** We inject a **Mock Adapter** (e.g., `GoldFileAdapter`).

## 2. The Host (SvelteKit) Design

We use a lightweight DI pattern (Factory Functions or Classes) to manage dependencies in `src/lib/server`.

### 2.1 The Interfaces

Define what "Doing AI" means, regardless of who does it.

```typescript
// src/lib/server/domain/interfaces.ts
import type { ProcessVideoResponse } from "$lib/gen/ai/v1/service_pb";

export interface IAiGateway {
  processVideo(filePath: string): Promise<ProcessVideoResponse>;
}

export interface IStorageGateway {
  uploadFile(file: File): Promise<string>; // Returns path
}
```

### 2.2 The Implementation (Real vs. Mock)

**The Real Gateway (ConnectRPC):**

```typescript
// src/lib/server/adapters/grpc-ai-gateway.ts
import { createPromiseClient } from "@connectrpc/connect";
import { AiService } from "$lib/gen/ai/v1/service_connect";
import type { IAiGateway } from "../domain/interfaces";

export class GrpcAiGateway implements IAiGateway {
  constructor(private client = createPromiseClient(AiService, transport)) {}

  async processVideo(path: string) {
    // This actually calls Python over the network
    return this.client.processVideo({ filePath: path });
  }
}
```

**The Mock Gateway (Gold File):**

```typescript
// src/lib/server/adapters/mock-ai-gateway.ts
import type { IAiGateway } from "../domain/interfaces";
import goldResponse from "../../../tests/fixtures/gold_transcript.json";

export class MockAiGateway implements IAiGateway {
  async processVideo(path: string) {
    // Instant return. Perfect for testing UI flows.
    return goldResponse;
  }
}
```

### 2.3 The Composition Root (Wiring it up)

We centralize instance creation in `src/lib/server/container.ts`.

```typescript
// src/lib/server/container.ts
import { RealAiGateway } from "./adapters/real-ai-gateway";
import { MockAiGateway } from "./adapters/mock-ai-gateway";
import { Orchestrator } from "./orchestrator";
import { SmartFilter } from "./filter";
import { SubtitleService } from "./services/subtitle.service";
import { db } from "./db";

const useMock =
  process.env.NODE_ENV === "test" || process.env.USE_MOCK_AI === "true";

// Ports/Adapters
export const aiGateway = useMock ? new MockAiGateway() : new RealAiGateway();

// Domain Services (Injected)
export const smartFilter = new SmartFilter(db);
export const subtitleService = new SubtitleService(db);

// Orchestrator (Injected)
export const orchestrator = new Orchestrator(aiGateway, db, smartFilter);
```

---

## 3. The Brain (Python) Design

Python uses FastAPI's built-in dependency injection for model management.

### 3.1 Wiring (FastAPI Depends)

We use lambda-based dependencies to inject model instances initialized in the app lifespan.

```python
# services/brain/main.py

@app.post("/transcribe")
async def transcribe(
    req: TranscriptionRequest,
    transcriber = Depends(lambda: brain_state.transcriber)
):
    return transcriber.transcribe(req.file_path, req.language)
```
