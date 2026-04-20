import { describe, it, expect } from "vitest";
import { resolveUploadDir, toAiServicePath } from "./config";
import path from "path";

const TEST_TIMEOUT_MS = 5000;

describe("resolveUploadDir", () => {
  it("WhenDocker_ThenReturnsDirAsIs", { timeout: TEST_TIMEOUT_MS }, () => {
    expect(resolveUploadDir("media/uploads", true)).toBe("media/uploads");
  });

  it(
    "WhenAbsoluteLinuxPath_ThenReturnsAsIs",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      expect(resolveUploadDir("/opt/uploads", false)).toBe("/opt/uploads");
    },
  );

  it("WhenWindowsPath_ThenReturnsAsIs", { timeout: TEST_TIMEOUT_MS }, () => {
    expect(resolveUploadDir("C:\\media\\uploads", false)).toBe(
      "C:\\media\\uploads",
    );
  });

  it(
    "WhenRelativePath_ThenResolvesAgainstCwd",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = resolveUploadDir("media/uploads", false);
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain("media/uploads");
    },
  );
});

describe("toAiServicePath", () => {
  it("WhenNotDocker_ThenReturnsLocalPath", { timeout: TEST_TIMEOUT_MS }, () => {
    expect(toAiServicePath("/home/user/media/uploads/video.mp4", false)).toBe(
      "/home/user/media/uploads/video.mp4",
    );
  });

  it(
    "WhenDocker_ThenExtractsFilenameAndPrefixesMediaRoot",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      expect(toAiServicePath("/home/user/media/uploads/video.mp4", true)).toBe(
        "/app/media/uploads/video.mp4",
      );
    },
  );

  it(
    "WhenDockerWithCustomMediaRoot_ThenUsesCustomRoot",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      expect(
        toAiServicePath("/local/path/audio.mp3", true, "/custom/media"),
      ).toBe("/custom/media/audio.mp3");
    },
  );

  it(
    "WhenWindowsPathInDocker_ThenExtractsFilename",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      expect(toAiServicePath("C:\\media\\uploads\\file.mp4", true)).toBe(
        "/app/media/uploads/file.mp4",
      );
    },
  );
});
