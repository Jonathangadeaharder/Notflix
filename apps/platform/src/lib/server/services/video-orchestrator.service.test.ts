import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { IAiGateway } from "../domain/interfaces";
import { aiGateway } from "../infrastructure/container";
import { db } from "../infrastructure/database";
import type { FilteredSegment, SmartFilter } from "./linguistic-filter.service";
import { SegmentClassification } from "./linguistic-filter.service";
import { Orchestrator } from "./video-orchestrator.service";

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

vi.mock("../infrastructure/database", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
  },
}));

const MOCK_VIDEO_ID = "vid-123";
const MOCK_FILE_PATH = "uploads/test.mp3";
const MOCK_VIDEO_PATH = "uploads/test.mp4";
const BROKEN_VIDEO_PATH = "bad.mp4";
const MOCK_TITLE = "Test Video";
const MOCK_TEXT = "Hola mundo";
const LANG_ES = "es";
const LANG_EN = "en";
const AUTHENTICATED_USER_ID = "user-1";
const FIRST_TRANSLATE_CALL = 1;
const SECOND_TRANSLATE_CALL = 2;
const MOCK_PROBABILITY = 0.99;
const FIRST_SEGMENT_END = 2;
const SECOND_SEGMENT_END = 4;

type MockedDb = {
  limit: Mock;
  set: Mock;
  update: Mock;
  where: Mock;
  delete: Mock;
  transaction: Mock;
};

describe("VideoOrchestratorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  registerGuestPipelineTest();
  registerFailurePipelineTest();
  registerLearningTranslationScopeTest();
});

function registerGuestPipelineTest() {
  it("should complete the full processing pipeline for a guest user", async () => {
    expect.hasAssertions();
    const mockedDb = prepareDbForVideo(MOCK_FILE_PATH);
    setupAiMocks(LANG_ES);

    await createOrchestrator().processVideo(MOCK_VIDEO_ID, LANG_ES, LANG_EN);

    verifyPipelineCalls(LANG_ES, LANG_EN);
    expectCompletedVideoSave(mockedDb);
  });
}

function registerFailurePipelineTest() {
  it("should mark video as ERROR if any step fails", async () => {
    const mockedDb = prepareDbForVideo(BROKEN_VIDEO_PATH);
    vi.mocked(aiGateway.transcribe).mockRejectedValue(new Error("AI Offline"));

    await expect(
      createOrchestrator().processVideo(MOCK_VIDEO_ID),
    ).rejects.toThrow("AI Offline");

    expect(mockedDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ERROR" }),
    );
  });
}

function registerLearningTranslationScopeTest() {
  it("should only translate unknown lemmas from LEARNING segments for authenticated users", async () => {
    expect.hasAssertions();
    const mockedDb = prepareDbForVideo(MOCK_VIDEO_PATH);
    setupLearningTranslationMocks();

    await createOrchestrator(createLearningSmartFilter()).processVideo(
      MOCK_VIDEO_ID,
      LANG_ES,
      LANG_EN,
      AUTHENTICATED_USER_ID,
    );

    expectLearningTranslationCalls();
    expectSavedLearningTranslations(mockedDb);
  });
}

function prepareDbForVideo(filePath: string) {
  const mockedDb = db as unknown as MockedDb;
  mockTransaction(mockedDb, []);
  mockedDb.limit.mockResolvedValueOnce([
    { id: MOCK_VIDEO_ID, filePath, title: MOCK_TITLE },
  ]);
  mockedDb.set.mockReturnThis();
  mockedDb.update.mockReturnThis();
  mockedDb.where.mockReturnThis();

  return mockedDb;
}

function createOrchestrator(smartFilter = {} as SmartFilter) {
  return new Orchestrator(
    aiGateway as unknown as IAiGateway,
    db as unknown as typeof db,
    smartFilter,
  );
}

function expectCompletedVideoSave(mockedDb: MockedDb) {
  expect(mockedDb.set).toHaveBeenCalledWith(
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
}

function setupLearningTranslationMocks() {
  vi.mocked(aiGateway.transcribe).mockResolvedValue({
    language: LANG_ES,
    language_probability: MOCK_PROBABILITY,
    segments: [
      { start: 0, end: FIRST_SEGMENT_END, text: "Hola amigo" },
      {
        start: FIRST_SEGMENT_END,
        end: SECOND_SEGMENT_END,
        text: "Mundo complejo",
      },
    ],
  });
  vi.mocked(aiGateway.analyzeBatch).mockResolvedValue({
    results: [
      [
        { text: "Hola", lemma: "hola", pos: "NOUN", is_stop: false },
        { text: "amigo", lemma: "amigo", pos: "NOUN", is_stop: false },
      ],
      [
        { text: "Mundo", lemma: "mundo", pos: "NOUN", is_stop: false },
        { text: "complejo", lemma: "complejo", pos: "ADJ", is_stop: false },
      ],
    ],
  });
  vi.mocked(aiGateway.generateThumbnail).mockResolvedValue({
    thumbnail_path: "thumb.jpg",
  });
  vi.mocked(aiGateway.translate)
    .mockResolvedValueOnce({ translations: ["Hello"] })
    .mockResolvedValueOnce({
      translations: ["Hello friend", "Complex world"],
    });
}

function createLearningSmartFilter() {
  return {
    filterBatch: vi.fn().mockResolvedValue([
      createFilteredSegment(SegmentClassification.LEARNING, [
        {
          text: "Hola",
          lemma: "hola",
          pos: "NOUN",
          is_stop: false,
          isKnown: false,
        },
        {
          text: "amigo",
          lemma: "amigo",
          pos: "NOUN",
          is_stop: false,
          isKnown: true,
        },
      ]),
      createFilteredSegment(SegmentClassification.HARD, [
        {
          text: "Mundo",
          lemma: "mundo",
          pos: "NOUN",
          is_stop: false,
          isKnown: false,
        },
        {
          text: "complejo",
          lemma: "complejo",
          pos: "ADJ",
          is_stop: false,
          isKnown: false,
        },
      ]),
    ]),
  } as unknown as SmartFilter;
}

function expectLearningTranslationCalls() {
  expect(aiGateway.translate).toHaveBeenNthCalledWith(
    FIRST_TRANSLATE_CALL,
    ["hola"],
    LANG_ES,
    LANG_EN,
  );
  expect(aiGateway.translate).toHaveBeenNthCalledWith(
    SECOND_TRANSLATE_CALL,
    ["Hola amigo", "Mundo complejo"],
    LANG_ES,
    LANG_EN,
  );
}

function expectSavedLearningTranslations(mockedDb: MockedDb) {
  const completionCall = mockedDb.set.mock.calls.find(
    ([value]) => value.status === "COMPLETED",
  );
  const savedSegments = completionCall?.[0].vttJson;

  expect(savedSegments?.[0].tokens[0].translation).toBe("Hello");
  expect(savedSegments?.[1].tokens[0].translation).toBeUndefined();
}

function mockTransaction(
  mockedDb: MockedDb,
  existingRows: Array<{ status?: string }>,
) {
  const tx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(existingRows),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
  mockedDb.transaction.mockImplementation(
    async (handler: (transactionDb: typeof tx) => Promise<unknown>) =>
      handler(tx),
  );
}

function setupAiMocks(language = LANG_ES) {
  vi.mocked(aiGateway.transcribe).mockResolvedValue({
    language,
    language_probability: MOCK_PROBABILITY,
    segments: [{ start: 0, end: FIRST_SEGMENT_END, text: MOCK_TEXT }],
  });
  vi.mocked(aiGateway.analyzeBatch).mockResolvedValue({
    results: [[{ text: "Hola", lemma: "hola", pos: "INTJ", is_stop: false }]],
  });
  vi.mocked(aiGateway.translate).mockResolvedValue({ translations: ["Hello"] });
  vi.mocked(aiGateway.generateThumbnail).mockResolvedValue({
    thumbnail_path: "thumb.jpg",
  });
}

function verifyPipelineCalls(sourceLanguage: string, targetLanguage: string) {
  expect(aiGateway.transcribe).toHaveBeenCalledWith(
    expect.stringContaining("test.mp3"),
    sourceLanguage,
  );
  expect(aiGateway.analyzeBatch).toHaveBeenCalledWith(
    [MOCK_TEXT],
    sourceLanguage,
  );
  expect(aiGateway.translate).toHaveBeenCalledWith(
    ["hola"],
    sourceLanguage,
    targetLanguage,
  );
}

function createFilteredSegment(
  classification: SegmentClassification,
  tokens: FilteredSegment["tokens"],
): FilteredSegment {
  return {
    classification,
    unknownCount: tokens.filter((token) => !token.isKnown).length,
    tokens,
  };
}
