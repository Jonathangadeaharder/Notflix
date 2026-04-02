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

  it("marks steps as error when processing failed", () => {
    expect(
      getUploadStepState("TRANSCRIBING", "ANALYZING", "ERROR", false),
    ).toBe("error");
  });

  it("marks future steps as pending", () => {
    expect(
      getUploadStepState("TRANSLATING", "ANALYZING", "PENDING", false),
    ).toBe("pending");
  });

  it("marks pending steps after error as pending", () => {
    expect(
      getUploadStepState("TRANSLATING", "TRANSCRIBING", "ERROR", false),
    ).toBe("pending");
  });

  it("uses UPLOADING as active stage when isSubmitting is true", () => {
    expect(getUploadStepState("UPLOADING", "QUEUED", "PENDING", true)).toBe(
      "active",
    );
  });
});
