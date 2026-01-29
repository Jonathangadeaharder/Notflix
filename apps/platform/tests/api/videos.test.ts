import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../src/routes/api/videos/+server";
import { db } from "$lib/server/infrastructure/database";

vi.mock("$lib/server/infrastructure/database", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("GET /api/videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET({
      locals: { auth: vi.fn().mockResolvedValue(null) },
    } as never);

    expect(response.status).toBe(401);
  });

  it("returns videos for authenticated users", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi
        .fn()
        .mockResolvedValueOnce([{ id: "v1", status: "COMPLETED" }]),
    };
    vi.mocked(db.select).mockReturnValue(chain as never);

    const response = await GET({
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.videos).toEqual([{ id: "v1", status: "COMPLETED" }]);
  });
});
