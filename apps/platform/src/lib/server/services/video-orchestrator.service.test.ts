import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { IAiGateway } from "../domain/interfaces";
import type { SmartFilter } from "./linguistic-filter.service";
import { aiGateway } from "../infrastructure/container";
import { db } from "../infrastructure/database";
import { Orchestrator } from "./video-orchestrator.service";

// Mock dependencies
vi.mock("../infrastructure/container", () => ({
  aiGateway: {
    transcribe: vi.fn(),
    analyzeBatch: vi.fn(),
    translate: vi.fn(),
    generateThumbnail: vi.fn(),
  },
  orchestrator: {},
  smartFilter: {},
  subtitleService: {},
}));

// Mock config so toAiServicePath is a passthrough (avoids env dependency in tests)
vi.mock("../infrastructure/config", () => ({
  CONFIG: { DEFAULT_TARGET_LANG: "es", DEFAULT_NATIVE_LANG: "en" },
  ProcessingStatus: {
    PENDING: "PENDING",
    COMPLETED: "COMPLETED",
    ERROR: "ERROR",
  },
  toAiServicePath: (p: string) => p,
}));

vi.mock("../infrastructure/database", () => {
  // Separate chain for transaction interior: always resolves with no existing lock
  const txChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
  return {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transaction: vi.fn().mockImplementation((fn: any) => fn(txChain)),
    },
  };
});

const TEST_TIMEOUT_MS = 10000;
const MOCK_TITLE = "Test Video";
const MOCK_TEXT = "Hola mundo";
const LANG_ES = "es";
const LANG_EN = "en";
const mockVideoId = "vid-123";
const mockFilePath = "uploads/test.mp3";

describe("VideoOrchestratorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "should complete the full processing pipeline for a guest user",
    async () => {
      const dbMock = db as unknown as { limit: Mock; set: Mock };

      dbMock.limit.mockResolvedValueOnce([
        { id: mockVideoId, filePath: mockFilePath, title: MOCK_TITLE },
      ]);

      setupAiMocks(LANG_ES);

      const orchestrator = new Orchestrator(
        aiGateway as unknown as IAiGateway,
        db as unknown as typeof db,
        {} as SmartFilter,
      );

      // --- ACT ---
      await orchestrator.processVideo(mockVideoId, LANG_ES, LANG_EN);

      // --- ASSERT ---
      verifyPipelineCalls(mockFilePath, LANG_ES, LANG_EN);

      expect(dbMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "COMPLETED",
          vttJson: expect.arrayContaining([
            expect.objectContaining({
              text: MOCK_TEXT,
              tokens: expect.arrayContaining([
                expect.objectContaining({ translation: "Hello" }),
              ]),
            }),
          ]),
        }),
      );
    },
    TEST_TIMEOUT_MS,
  );
});

describe("Orchestrator: error and advanced paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "should mark video as ERROR if any step fails",
    async () => {
      const dbMock = db as unknown as { limit: Mock; set: Mock };

      dbMock.limit.mockResolvedValueOnce([
        { id: mockVideoId, filePath: mockFilePath, title: MOCK_TITLE },
      ]);
      vi.mocked(aiGateway.transcribe).mockRejectedValue(
        new Error("AI Offline"),
      );

      const orchestrator = new Orchestrator(
        aiGateway as unknown as IAiGateway,
        db as unknown as typeof db,
        {} as SmartFilter,
      );

      await expect(orchestrator.processVideo(mockVideoId)).rejects.toThrow(
        "AI Offline",
      );

      expect(dbMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ERROR",
        }),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "should complete processing for an authenticated user with filter",
    async () => {
      const dbMock = db as unknown as { limit: Mock; set: Mock };

      dbMock.limit.mockResolvedValueOnce([
        { id: mockVideoId, filePath: mockFilePath, title: MOCK_TITLE },
      ]);

      setupAiMocks(LANG_ES);

      const mockFilter = {
        filterBatch: vi.fn().mockResolvedValue([
          {
            classification: "EASY",
            tokens: [
              {
                text: "Hola",
                lemma: "hola",
                pos: "INTJ",
                is_stop: false,
                isKnown: false,
              },
            ],
          },
        ]),
      } as unknown as SmartFilter;

      const orchestrator = new Orchestrator(
        aiGateway as unknown as IAiGateway,
        db as unknown as typeof db,
        mockFilter,
      );

      await orchestrator.processVideo(
        mockVideoId,
        LANG_ES,
        LANG_EN,
        "user-123",
      );

      expect(mockFilter.filterBatch).toHaveBeenCalled();
      expect(dbMock.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "COMPLETED",
        }),
      );
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "should generate thumbnail for video files (non-audio)",
    async () => {
      const videoFilePath = "uploads/test.mp4";
      const dbMock = db as unknown as { limit: Mock; set: Mock };

      dbMock.limit.mockResolvedValueOnce([
        { id: mockVideoId, filePath: videoFilePath, title: MOCK_TITLE },
      ]);

      setupAiMocks(LANG_ES);

      const orchestrator = new Orchestrator(
        aiGateway as unknown as IAiGateway,
        db as unknown as typeof db,
        {} as SmartFilter,
      );

      await orchestrator.processVideo(mockVideoId, LANG_ES, LANG_EN);

      expect(aiGateway.generateThumbnail).toHaveBeenCalledWith(videoFilePath);
    },
    TEST_TIMEOUT_MS,
  );
});

function setupAiMocks(es = LANG_ES) {
  const MOCK_PROBABILITY = 0.99;
  const MOCK_SEGMENT_START = 0;
  const MOCK_SEGMENT_END = 2;

  vi.mocked(aiGateway.transcribe).mockResolvedValue({
    language: es,
    language_probability: MOCK_PROBABILITY,
    segments: [
      { start: MOCK_SEGMENT_START, end: MOCK_SEGMENT_END, text: MOCK_TEXT },
    ],
  });

  vi.mocked(aiGateway.analyzeBatch).mockResolvedValue({
    results: [[{ text: "Hola", lemma: "hola", pos: "INTJ", is_stop: false }]],
  });

  vi.mocked(aiGateway.translate).mockResolvedValue({
    translations: ["Hello"],
  });

  vi.mocked(aiGateway.generateThumbnail).mockResolvedValue({
    thumbnail_path: "thumb.jpg",
  });
}

function verifyPipelineCalls(mockFilePath: string, es: string, en: string) {
  expect(aiGateway.transcribe).toHaveBeenCalledWith(mockFilePath, es);
  expect(aiGateway.analyzeBatch).toHaveBeenCalledWith([MOCK_TEXT], es);
  expect(aiGateway.translate).toHaveBeenCalledWith(["hola"], es, en);
}
