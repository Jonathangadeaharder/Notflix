import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../src/routes/api/game/generate/+server";
import { HTTP_STATUS } from "$lib/constants";

vi.mock("$lib/server/services/chunker.service", () => ({
  generateDeck: vi.fn(),
}));

describe("GET /api/game/generate — videoId validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when videoId is not a valid UUID", async () => {
    const url = new URL(
      "http://localhost/api/game/generate?videoId=nonexistent&start=0&end=60&targetLang=es",
    );

    const response = await GET({
      url,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });
});
