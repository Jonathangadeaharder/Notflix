import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPathWithinRoot,
  toPosixPath,
  toRelativePathFromRoot,
} from "./path-utils";
import path from "path";

const rootPath = "/root/base";

describe("isPathWithinRoot", () => {
  it("returns true if candidate path is the same as root path", () => {
    expect(isPathWithinRoot(rootPath, rootPath)).toBe(true);
  });

  it("returns true if candidate path is inside root path", () => {
    expect(isPathWithinRoot(path.join(rootPath, "subdir"), rootPath)).toBe(
      true,
    );
    expect(
      isPathWithinRoot(path.join(rootPath, "subdir", "file.txt"), rootPath),
    ).toBe(true);
  });

  it("returns false if candidate path is outside root path (parent)", () => {
    expect(isPathWithinRoot(path.join(rootPath, ".."), rootPath)).toBe(false);
  });

  it("returns false if candidate path is outside root path (sibling)", () => {
    expect(isPathWithinRoot("/root/other", rootPath)).toBe(false);
  });

  it("handles relative paths for both candidate and root", () => {
    const relativeRoot = "project/root";
    const insideCandidate = path.join(relativeRoot, "subdir");
    const outsideCandidate = "outside";

    expect(isPathWithinRoot(insideCandidate, relativeRoot)).toBe(true);
    expect(isPathWithinRoot(outsideCandidate, relativeRoot)).toBe(false);
  });
});

describe("toRelativePathFromRoot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns normalized relative path if inside root", () => {
    expect(
      toRelativePathFromRoot(
        path.join(rootPath, "subdir", "file.txt"),
        rootPath,
      ),
    ).toBe("subdir/file.txt");
  });

  it("returns empty string if candidate path is root path", () => {
    expect(toRelativePathFromRoot(rootPath, rootPath)).toBe("");
  });

  it("returns null if candidate path is outside root", () => {
    expect(toRelativePathFromRoot("/outside", rootPath)).toBe(null);
  });

  it("normalizes backslashes returned by path.relative", () => {
    const candidate = path.join(rootPath, "sub", "file.txt");
    vi.spyOn(path, "relative").mockReturnValue("sub\\file.txt");

    const result = toRelativePathFromRoot(candidate, rootPath);

    expect(path.relative).toHaveBeenCalledWith(
      path.resolve(rootPath),
      path.resolve(candidate),
    );
    expect(result).toBe("sub/file.txt");
  });
});

describe("toPosixPath", () => {
  it("converts backslashes to forward slashes", () => {
    expect(toPosixPath("path\\with\\backslashes")).toBe(
      "path/with/backslashes",
    );
  });

  it("leaves forward slashes unchanged", () => {
    expect(toPosixPath("path/with/forward/slashes")).toBe(
      "path/with/forward/slashes",
    );
  });

  it("handles mixed slashes", () => {
    expect(toPosixPath("path\\with/mixed\\slashes")).toBe(
      "path/with/mixed/slashes",
    );
  });
});
