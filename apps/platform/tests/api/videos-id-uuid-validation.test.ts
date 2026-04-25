import { describe, it, expect, vi } from "vitest";
import { DELETE } from "../../src/routes/api/videos/[id]/+server";
import { HTTP_STATUS } from "$lib/constants";

const UUID_V4 = "550e8400-e29b-41d4-a716-446655440000";

vi.mock("$lib/server/services/delete-video.service", () => ({
  deleteVideoAndAssets: vi.fn(),
}));

const { deleteVideoAndAssets } = await import(
  "$lib/server/services/delete-video.service"
);

describe("DELETE /api/videos/[id] — UUID validation", () => {
  it("returns 400 when id is not a valid UUID", async () => {
    const response = await DELETE({
      params: { id: "nonexistent" },
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    const body = await response.json();
    expect(body.error).toMatch(/uuid/i);
  });

  it("does not call deleteVideoAndAssets for invalid UUID", async () => {
    await DELETE({
      params: { id: "not-a-uuid" },
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(deleteVideoAndAssets).not.toHaveBeenCalled();
  });

  it("calls deleteVideoAndAssets for valid UUID", async () => {
    vi.mocked(deleteVideoAndAssets).mockResolvedValueOnce({
      ok: true,
    });

    await DELETE({
      params: { id: UUID_V4 },
      locals: { auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }) },
    } as never);

    expect(deleteVideoAndAssets).toHaveBeenCalledWith(UUID_V4);
  });
});
