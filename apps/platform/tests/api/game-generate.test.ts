import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../src/routes/api/game/generate/+server";
import { generateDeck } from "$lib/server/services/chunker.service";
import type { GameCard } from "$lib/server/services/chunker.service";

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

    expect(response.status).toBe(401);
  });

  it("returns 400 when videoId is missing", async () => {
    const url = new URL("http://localhost/api/game/generate");
    const response = await GET({
      url,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(400);
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
      "http://localhost/api/game/generate?videoId=vid-1&start=0&end=120&targetLang=es",
    );
    const response = await GET({
      url,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cards).toHaveLength(1);
    expect(body.nextChunkStart).toBe(120);
    expect(generateDeck).toHaveBeenCalledWith("u1", "vid-1", 0, 120, "es");
  });
});
