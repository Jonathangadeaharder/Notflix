import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../src/routes/api/health/+server";
import { db } from "$lib/server/infrastructure/database";

vi.mock("$lib/server/infrastructure/database", () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok status when database is reachable", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([] as never);

    const response = await GET({} as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services.database).toBe("connected");
  });

  it("returns 503 when database check fails", async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error("DB down"));

    const response = await GET({} as never);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
  });
});
