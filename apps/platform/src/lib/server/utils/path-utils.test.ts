import { describe, expect, it } from "vitest";
import { isPathWithinRoot, toPosixPath, toRelativePathFromRoot } from "./path-utils";
import path from "path";

describe("path-utils", () => {
  const rootPath = "/root/base";

  describe("isPathWithinRoot", () => {
    it("returns true if candidate path is the same as root path", () => {
      expect(isPathWithinRoot(rootPath, rootPath)).toBe(true);
    });

    it("returns true if candidate path is inside root path", () => {
      expect(isPathWithinRoot(path.join(rootPath, "subdir"), rootPath)).toBe(true);
      expect(isPathWithinRoot(path.join(rootPath, "subdir", "file.txt"), rootPath)).toBe(true);
    });

    it("returns false if candidate path is outside root path (parent)", () => {
      expect(isPathWithinRoot(path.join(rootPath, ".."), rootPath)).toBe(false);
    });

    it("returns false if candidate path is outside root path (sibling)", () => {
      expect(isPathWithinRoot("/root/other", rootPath)).toBe(false);
    });

    it("handles relative paths by resolving them", () => {
      // Assuming CWD is the project root for these tests
      const absoluteRoot = path.resolve("src");
      expect(isPathWithinRoot("src/lib", absoluteRoot)).toBe(true);
      expect(isPathWithinRoot("..", absoluteRoot)).toBe(false);
    });
  });

  describe("toRelativePathFromRoot", () => {
    it("returns normalized relative path if inside root", () => {
      expect(toRelativePathFromRoot(path.join(rootPath, "subdir", "file.txt"), rootPath)).toBe("subdir/file.txt");
    });

    it("returns empty string if candidate path is root path", () => {
      expect(toRelativePathFromRoot(rootPath, rootPath)).toBe("");
    });

    it("returns null if candidate path is outside root", () => {
      expect(toRelativePathFromRoot("/outside", rootPath)).toBe(null);
    });

    it("normalizes backslashes to forward slashes", () => {
      // Even on Linux, path.relative might not produce backslashes,
      // but toRelativePathFromRoot explicitly replaces them.
      // We can mock path behavior or just test the replacement logic.
      const candidate = rootPath + path.sep + "sub" + path.sep + "file.txt";
      const result = toRelativePathFromRoot(candidate, rootPath);
      expect(result).not.toContain("\\");
      expect(result).toBe("sub/file.txt");
    });
  });

  describe("toPosixPath", () => {
    it("converts backslashes to forward slashes", () => {
      expect(toPosixPath("path\\with\\backslashes")).toBe("path/with/backslashes");
    });

    it("leaves forward slashes unchanged", () => {
      expect(toPosixPath("path/with/forward/slashes")).toBe("path/with/forward/slashes");
    });

    it("handles mixed slashes", () => {
      expect(toPosixPath("path\\with/mixed\\slashes")).toBe("path/with/mixed/slashes");
    });
  });
});
