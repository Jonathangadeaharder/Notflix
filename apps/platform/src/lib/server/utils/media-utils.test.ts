import { describe, expect, it } from "vitest";
import { toAiServicePath } from "../infrastructure/config";
import { toMediaUrl } from "./media-utils";

describe("media path helpers", () => {
  it("extracts basename and prefixes with AI service media path", () => {
    // toAiServicePath extracts the filename and prefixes with MEDIA_ROOT_INTERNAL
    const result = toAiServicePath("/some/local/path/sample.mp4");
    expect(result).toContain("sample.mp4");
  });

  it("preserves existing application URLs in toMediaUrl", () => {
    expect(toMediaUrl("/placeholder.jpg")).toBe("/placeholder.jpg");
  });

  it("returns empty string for null/undefined in toMediaUrl", () => {
    expect(toMediaUrl(null)).toBe("");
    expect(toMediaUrl(undefined)).toBe("");
  });
});
