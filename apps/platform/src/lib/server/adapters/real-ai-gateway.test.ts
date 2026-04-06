import { describe, it, expect, vi, beforeEach } from "vitest";
import { RealAiGateway, AiServiceError } from "./real-ai-gateway";

const TEST_AI_URL = "http://test-ai:8000"; // eslint-disable-line sonarjs/no-clear-text-protocols

// Mock config
vi.mock("../infrastructure/config", () => ({
  CONFIG: {
    AI_SERVICE_URL: "http://test-ai:8000", // eslint-disable-line sonarjs/no-clear-text-protocols
    AI_SERVICE_API_KEY: "test-key",
    DEFAULT_TARGET_LANG: "es",
  },
}));

// Mock request context
vi.mock("../request-context", () => ({
  getRequestId: vi.fn(() => "req-123"),
}));

function mockFetch(response: object) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    }),
  );
}

const HTTP_SERVER_ERROR = 500;

describe("RealAiGateway: successful calls", () => {
  let gateway: RealAiGateway;

  beforeEach(() => {
    vi.restoreAllMocks();
    gateway = new RealAiGateway();
  });

  it("transcribes with correct URL and headers", async () => {
    const mockResponse = {
      segments: [],
      language: "es",
      language_probability: 0.99,
    };
    mockFetch(mockResponse);

    const result = await gateway.transcribe("/path/file.mp3", "es");
    expect(result).toEqual(mockResponse);

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[0]).toBe(`${TEST_AI_URL}/transcribe`);

    const headers = (fetchCall[1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers["X-API-Key"]).toBe("test-key");
    expect(headers["X-Request-ID"]).toBe("req-123");
  });

  it("calls analyzeBatch correctly", async () => {
    mockFetch({ results: [[]] });
    await expect(gateway.analyzeBatch(["hello"], "es")).resolves.toEqual({
      results: [[]],
    });
  });

  it("calls translate correctly", async () => {
    mockFetch({ translations: ["hola"] });
    await expect(gateway.translate(["hello"], "en", "es")).resolves.toEqual({
      translations: ["hola"],
    });
  });

  it("calls generateThumbnail correctly", async () => {
    mockFetch({ thumbnail_path: "thumb.jpg" });
    await expect(gateway.generateThumbnail("/path/video.mp4")).resolves.toEqual(
      { thumbnail_path: "thumb.jpg" },
    );
  });
});

describe("RealAiGateway: error handling", () => {
  it("throws AiServiceError on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: HTTP_SERVER_ERROR,
        text: () => Promise.resolve("GPU out of memory"),
        statusText: "Internal Server Error",
      }),
    );

    const gateway = new RealAiGateway();
    await expect(gateway.transcribe("/path/file.mp3")).rejects.toThrow(
      AiServiceError,
    );
  });
});
