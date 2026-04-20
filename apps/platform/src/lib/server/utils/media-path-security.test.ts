import { describe, it, expect, afterAll } from "vitest";
import { resolveMediaPath, MediaPathError } from "./media-path-security";
import path from "path";
import fs from "fs";
import os from "os";

const TEST_TIMEOUT_MS = 5000;

describe("resolveMediaPath", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-test-"));
  const mediaRoot = path.join(tmpDir, "media");
  fs.mkdirSync(path.join(mediaRoot, "uploads"), { recursive: true });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it(
    "WhenValidPathWithinMediaRoot_ThenResolves",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = resolveMediaPath("uploads/video.mp4", mediaRoot);
      expect(result.fullPath).toBe(
        path.join(mediaRoot, "uploads", "video.mp4"),
      );
      expect(result.contentType).toBe("video/mp4");
    },
  );

  it(
    "WhenPathTraversalWithDotDot_ThenRejected",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      let caught: MediaPathError | undefined;
      try {
        resolveMediaPath("../../../etc/passwd", mediaRoot);
      } catch (err) {
        caught = err as MediaPathError;
      }
      expect(caught).toBeInstanceOf(MediaPathError);
      expect(caught?.statusCode).toBe(403);
    },
  );

  it(
    "WhenSiblingPrefixTraversal_ThenRejected",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      let caught: MediaPathError | undefined;
      try {
        resolveMediaPath("../media-evil/file.mp4", mediaRoot);
      } catch (err) {
        caught = err as MediaPathError;
      }
      expect(caught).toBeInstanceOf(MediaPathError);
      expect(caught?.statusCode).toBe(403);
    },
  );

  it("WhenUndefinedPath_ThenRejected", { timeout: TEST_TIMEOUT_MS }, () => {
    let caught: MediaPathError | undefined;
    try {
      resolveMediaPath(undefined, mediaRoot);
    } catch (err) {
      caught = err as MediaPathError;
    }
    expect(caught).toBeInstanceOf(MediaPathError);
    expect(caught?.statusCode).toBe(400);
  });

  it(
    "WhenValidContentTypeMapping_ThenCorrectType",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const cases: [string, string][] = [
        ["file.mp4", "video/mp4"],
        ["file.mp3", "audio/mpeg"],
        ["file.wav", "audio/wav"],
        ["file.jpg", "image/jpeg"],
        ["file.jpeg", "image/jpeg"],
        ["file.png", "image/png"],
        ["file.webp", "image/webp"],
        ["file.webm", "video/webm"],
        ["file.xyz", "application/octet-stream"],
      ];
      for (const [filename, expectedType] of cases) {
        const result = resolveMediaPath(filename, mediaRoot);
        expect(result.contentType).toBe(expectedType);
      }
    },
  );
});
