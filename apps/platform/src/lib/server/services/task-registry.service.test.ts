import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskRegistry } from "./task-registry.service";
import { logger } from "$lib/logger";

vi.mock("$lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TaskRegistry", () => {
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
