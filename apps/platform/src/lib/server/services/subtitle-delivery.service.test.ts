import { describe, it, expect, vi } from "vitest";
import {
  SubtitleDeliveryError,
  buildSubtitleResponse,
} from "./subtitle-delivery.service";

describe("buildSubtitleResponse", () => {
  it("returns vtt response for valid mode", async () => {
    const service = {
      generateVtt: vi.fn().mockResolvedValue("WEBVTT\n"),
    };

    const response = await buildSubtitleResponse(
      "video-1",
      "native",
      service as never,
    );
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/vtt");
    expect(body).toContain("WEBVTT");
    expect(service.generateVtt).toHaveBeenCalledWith("video-1", "native");
  });

  it("throws 400 for invalid subtitle mode", async () => {
    await expect(
      buildSubtitleResponse("video-1", "invalid", {
        generateVtt: vi.fn(),
      } as never),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when subtitles are missing", async () => {
    await expect(
      buildSubtitleResponse("video-1", "native", {
        generateVtt: vi.fn().mockResolvedValue(null),
      } as never),
    ).rejects.toBeInstanceOf(SubtitleDeliveryError);
  });
});
