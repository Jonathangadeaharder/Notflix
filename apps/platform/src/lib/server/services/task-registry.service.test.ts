import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskRegistry } from "./task-registry.service";
import { logger } from "$lib/logger";

vi.mock("$lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TaskRegistry: resolved tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs completion for a resolved background task", async () => {
    const work = Promise.resolve("ok");

    taskRegistry.register("unit-test", work);
    await work;
    await taskRegistry.waitForAll();

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "unit-test",
        taskId: expect.any(String),
      }),
      "Background task registered",
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "unit-test",
        taskId: expect.any(String),
      }),
      "Background task completed",
    );
  });

  it("logs failures for a rejected background task", async () => {
    const work = Promise.reject(new Error("boom"));

    taskRegistry.register("unit-test-error", work);
    await work.catch(() => undefined);
    await taskRegistry.waitForAll();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "unit-test-error",
        taskId: expect.any(String),
        err: "boom",
      }),
      "Background task failed",
    );
  });
});

describe("TaskRegistry: failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles non-Error rejections gracefully", async () => {
    const work = Promise.reject("string error");

    taskRegistry.register("unit-test-string-error", work);
    await work.catch(() => undefined);
    await taskRegistry.waitForAll();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: "string error",
      }),
      "Background task failed",
    );
  });

  it("logs pending count when waitForAll called with active tasks", async () => {
    let resolveTask!: () => void;
    const work = new Promise<void>((resolve) => {
      resolveTask = resolve;
    });

    taskRegistry.register("pending-test", work);

    // Start waitForAll while task is still pending
    const waitPromise = taskRegistry.waitForAll();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ count: expect.any(Number) }),
      "Waiting for background tasks to complete...",
    );

    resolveTask();
    await waitPromise;
  });
});
