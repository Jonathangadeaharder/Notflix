import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../src/routes/api/words/known/+server";
import { db } from "$lib/server/infrastructure/database";

vi.mock("$lib/server/infrastructure/database", () => ({
  db: {
    insert: vi.fn(),
  },
}));

describe("POST /api/words/known", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const request = new Request("http://localhost/api/words/known", {
      method: "POST",
    });
    const response = await POST({
      request,
      locals: { auth: vi.fn().mockResolvedValue(null) },
    } as never);

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/words/known", {
      method: "POST",
      body: "{bad-json",
    });

    const response = await POST({
      request,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(400);
  });

  it("returns 400 when lemma or lang is missing", async () => {
    const request = new Request("http://localhost/api/words/known", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lemma: "hola" }),
    });

    const response = await POST({
      request,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(400);
  });

  it("stores known words for authenticated users", async () => {
    const chain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValueOnce(undefined),
    };
    vi.mocked(db.insert).mockReturnValue(chain as never);

    const request = new Request("http://localhost/api/words/known", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lemma: "hola", lang: "es" }),
    });

    const response = await POST({
      request,
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(200);
    expect(chain.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", lemma: "hola", lang: "es" }),
    );
  });
});
