import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../src/routes/api/videos/+server";
import { db } from "$lib/server/infrastructure/database";
import { HTTP_STATUS } from "$lib/constants";

vi.mock("$lib/server/infrastructure/database", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("GET /api/videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(body.videos).toEqual([{ id: "v1", status: "COMPLETED" }]);
  });
});
