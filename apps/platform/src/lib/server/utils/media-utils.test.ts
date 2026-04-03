import { describe, expect, it } from "vitest";
import { toAiServicePath } from "../infrastructure/config";
import { toMediaUrl, calculateChunks } from "./media-utils";

describe("media path helpers", () => {
  it("extracts basename and prefixes with AI service media path", () => {
    const result = toAiServicePath("/some/local/path/sample.mp4");
    expect(result).toContain("sample.mp4");
  });

  it("preserves existing application URLs in toMediaUrl", () => {
    expect(toMediaUrl("/placeholder.jpg")).toBe("/placeholder.jpg");
  });

  it("returns empty string for null/undefined in toMediaUrl", () => {
    expect(toMediaUrl(undefined)).toBe("");
  });
});

describe("calculateChunks", () => {
  it("slices 120s video with 30s chunks", () => {
    const chunks = calculateChunks(120, 30);
    // Since we have a 0.5s overlap built into the function:
    // 0 -> 30, 29.5 -> 59.5, 59 -> 89, 88.5 -> 118.5, 118 -> 120
    expect(chunks).toHaveLength(5);
    expect(chunks[0]).toEqual({ start: 0, end: 30 });
    expect(chunks[chunks.length - 1].end).toBe(120);
  });

  it("handles edge cases perfectly", () => {
    expect(calculateChunks(0, 30)).toEqual([]);
    expect(calculateChunks(10, 30)).toEqual([{ start: 0, end: 10 }]);
  });
});
