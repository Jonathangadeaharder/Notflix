import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest";
import type { IAiGateway } from "../domain/interfaces";
import type { SmartFilter } from "./linguistic-filter.service";
import { Orchestrator } from "./video-orchestrator.service";
import { toAiServicePath } from "../infrastructure/config";

// Type for our mocked db
interface MockedDb {
  select: MockedFunction<() => typeof mockedDbChain>;
  from: MockedFunction<() => typeof mockedDbChain>;
  where: MockedFunction<() => typeof mockedDbChain>;
  limit: MockedFunction<() => Promise<unknown[]>>;
  insert: MockedFunction<() => typeof mockedDbChain>;
  values: MockedFunction<() => typeof mockedDbChain>;
  onConflictDoUpdate: MockedFunction<() => typeof mockedDbChain>;
  update: MockedFunction<() => typeof mockedDbChain>;
  set: MockedFunction<() => typeof mockedDbChain>;
  transaction: MockedFunction<
    (cb: (tx: MockedDb) => Promise<unknown>) => Promise<unknown>
  >;
}

const mockedDbChain = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

const mockDb: MockedDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  transaction: vi.fn(),
};

// Create a fresh mock for each method that returns mockReturnThis
Object.assign(mockDb, {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  onConflictDoUpdate: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
});

const mockAiGateway = {
  transcribe: vi.fn(),
  analyzeBatch: vi.fn(),
  translate: vi.fn(),
  generateThumbnail: vi.fn(),
};

const MOCK_TITLE = "Test Video";
const MOCK_TEXT = "Hola mundo";
const LANG_ES = "es";
const LANG_EN = "en";

describe("VideoOrchestratorService", () => {
  const mockVideoId = "vid-123";
  const mockFilePath = "uploads/test.mp3";

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mock implementations
    mockDb.select.mockImplementation(() => mockDb);
    mockDb.from.mockImplementation(() => mockDb);
    mockDb.where.mockImplementation(() => mockDb);
    mockDb.insert.mockImplementation(() => mockDb);
    mockDb.values.mockImplementation(() => mockDb);
    mockDb.onConflictDoUpdate.mockImplementation(() => mockDb);
    mockDb.update.mockImplementation(() => mockDb);
    mockDb.set.mockImplementation(() => mockDb);

    mockDb.transaction.mockImplementation(async (callback) => {
      return callback(mockDb);
    });
  });

  it("should complete the full processing pipeline for a guest user", async () => {
    // Setup DB mocks
    mockDb.limit
      .mockResolvedValueOnce([]) // acquireProcessingLock existing check
      .mockResolvedValueOnce([
        { id: mockVideoId, filePath: mockFilePath, title: MOCK_TITLE },
      ]);

    setupAiMocks(LANG_ES);

    const orchestrator = new Orchestrator(
      mockAiGateway as unknown as IAiGateway,
      mockDb as unknown as Parameters<
        typeof Orchestrator.prototype.processVideo
      >[0] extends infer T
        ? T extends { db: infer D }
          ? D
          : never
        : never,
      {} as SmartFilter,
    );

    // --- ACT ---
    await orchestrator.processVideo(mockVideoId, LANG_ES, LANG_EN);

    // --- ASSERT ---
    verifyPipelineCalls(mockFilePath, LANG_ES, LANG_EN);

    // Verify results were saved
    expect(mockDb.set).toHaveBeenCalledWith(
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
  });

  it("should mark video as ERROR if any step fails", async () => {
    mockDb.limit
      .mockResolvedValueOnce([]) // acquireProcessingLock existing check
      .mockResolvedValueOnce([
        { id: mockVideoId, filePath: "bad.mp4", title: MOCK_TITLE },
      ]);
    mockAiGateway.transcribe.mockRejectedValue(new Error("AI Offline"));

    const orchestrator = new Orchestrator(
      mockAiGateway as unknown as IAiGateway,
      mockDb as never,
      {} as SmartFilter,
    );

    // --- ACT & ASSERT ---
    await expect(orchestrator.processVideo(mockVideoId)).rejects.toThrow(
      "AI Offline",
    );

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ERROR",
      }),
    );
  });

  function setupAiMocks(es = LANG_ES) {
    const MOCK_PROBABILITY = 0.99;
    const MOCK_SEGMENT_START = 0;
    const MOCK_SEGMENT_END = 2;

    mockAiGateway.transcribe.mockResolvedValue({
      language: es,
      language_probability: MOCK_PROBABILITY,
      segments: [
        { start: MOCK_SEGMENT_START, end: MOCK_SEGMENT_END, text: MOCK_TEXT },
      ],
    });

    mockAiGateway.analyzeBatch.mockResolvedValue({
      results: [[{ text: "Hola", lemma: "hola", pos: "INTJ", is_stop: false }]],
    });

    mockAiGateway.translate.mockResolvedValue({
      translations: ["Hello"],
    });

    mockAiGateway.generateThumbnail.mockResolvedValue({
      thumbnail_path: "thumb.jpg",
    });
  }

  function verifyPipelineCalls(mockFilePath: string, es: string, en: string) {
    expect(mockAiGateway.transcribe).toHaveBeenCalledWith(
      toAiServicePath(mockFilePath),
      es,
    );
    expect(mockAiGateway.analyzeBatch).toHaveBeenCalledWith([MOCK_TEXT], es);
    expect(mockAiGateway.translate).toHaveBeenCalledWith(["hola"], es, en);
  }
});
