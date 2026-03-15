import { describe, expect, it } from "vitest";
import { getUploadStepState } from "./upload-pipeline";

describe("upload-pipeline", () => {
  it("marks the current processing stage as active", () => {
    expect(getUploadStepState("ANALYZING", "ANALYZING", "PENDING", false)).toBe(
      "active",
    );
  });

  it("marks completed steps as complete once processing reaches ready", () => {
    expect(getUploadStepState("QUEUED", "READY", "COMPLETED", false)).toBe(
      "complete",
    );
    expect(getUploadStepState("READY", "READY", "COMPLETED", false)).toBe(
      "active",
    );
  });
});
