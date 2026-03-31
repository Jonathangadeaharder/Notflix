import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../src/routes/api/game/generate/+server";
import { generateDeck } from "$lib/server/services/chunker.service";
import type { GameCard } from "$lib/server/services/chunker.service";
import { HTTP_STATUS } from "$lib/constants";

const CHUNK_END_SECONDS = 120;

vi.mock("$lib/server/services/chunker.service", () => ({
  generateDeck: vi.fn(),
}));

describe("GET /api/game/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const url = new URL("http://localhost/api/game/generate?videoId=vid-1");
    const response = await GET({
      url,
      locals: { auth: vi.fn().mockResolvedValue(null) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it("returns 400 when videoId is missing", async () => {
    const url = new URL("http://localhost/api/game/generate");
    const response = await GET({
      url,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it("returns cards for valid requests", async () => {
    const mockCard: GameCard = {
      lemma: "gato",
      lang: "es",
      original: "gato",
      contextSentence: "El gato está en la mesa.",
      cefr: "A1",
      translation: "cat",
      isKnown: false,
    };
    vi.mocked(generateDeck).mockResolvedValueOnce([mockCard]);

    const url = new URL(
      `http://localhost/api/game/generate?videoId=vid-1&start=0&end=${CHUNK_END_SECONDS}&targetLang=es`,
    );
    const response = await GET({
      url,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    const body = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body.cards).toHaveLength(1);
    expect(body.nextChunkStart).toBe(CHUNK_END_SECONDS);
    expect(generateDeck).toHaveBeenCalledWith(
      "u1",
      "vid-1",
      0,
      CHUNK_END_SECONDS,
      "es",
    );
  });
});
