import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../src/routes/api/words/known/+server";
import { HTTP_STATUS } from "$lib/constants";

const WORDS_KNOWN_URL = "http://localhost/api/words/known";

vi.mock("$lib/server/infrastructure/database", () => ({
  db: {
    insert: vi.fn(),
  },
}));

describe("POST /api/words/known — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when lemma exceeds max length", async () => {
    const longLemma = "a".repeat(201);
    const request = new Request(WORDS_KNOWN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lemma: longLemma, lang: "es" }),
    });

    const response = await POST({
      request,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it("returns 400 when lang is not a valid code", async () => {
    const request = new Request(WORDS_KNOWN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lemma: "hola", lang: "spanish-is-not-a-code" }),
    });

    const response = await POST({
      request,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });
});
