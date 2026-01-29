import { RealAiGateway } from "../adapters/real-ai-gateway";
import { MockAiGateway } from "../adapters/mock-ai-gateway";
import type { IAiGateway } from "../domain/interfaces";
import { Orchestrator } from "../services/video-orchestrator.service";
import { SmartFilter } from "../services/linguistic-filter.service";
import { SubtitleService } from "../services/subtitle.service";
import { db } from "./database";

// Determine which adapter to use
const useMock =
  process.env.NODE_ENV === "test" || process.env.USE_MOCK_AI === "true";

export const aiGateway: IAiGateway = useMock
  ? new MockAiGateway()
  : new RealAiGateway();

export const smartFilter = new SmartFilter(db);

export const subtitleService = new SubtitleService(db);

// Singleton instance with dependencies injected
export const orchestrator = new Orchestrator(aiGateway, db, smartFilter);

console.log(
  `[Container] Initialized Container with: ${useMock ? "MockAiGateway" : "RealAiGateway"}`,
);
