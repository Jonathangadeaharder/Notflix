import path from "path";
import { describe, expect, it } from "vitest";
import { CONFIG, toAiServicePath } from "../infrastructure/config";
import { toMediaUrl } from "./media-utils";

describe("media path helpers", () => {
  it("converts absolute media paths to media-root-relative AI inputs", () => {
    const absoluteMediaPath = path.join(
      CONFIG.MEDIA_ROOT,
      "uploads",
      "sample.mp4",
    );

    expect(toAiServicePath(absoluteMediaPath)).toBe("uploads/sample.mp4");
  });

  it("converts absolute media paths to proxied media URLs", () => {
    const absoluteMediaPath = path.join(
      CONFIG.MEDIA_ROOT,
      "uploads",
      "sample.mp4",
    );

    expect(toMediaUrl(absoluteMediaPath)).toBe("/media/uploads/sample.mp4");
  });

  it("preserves existing application URLs", () => {
    expect(toMediaUrl("/placeholder.jpg")).toBe("/placeholder.jpg");
  });

  it("normalizes relative AI inputs to posix paths", () => {
    expect(toAiServicePath("uploads\\sample.mp4")).toBe("uploads/sample.mp4");
  });
});
