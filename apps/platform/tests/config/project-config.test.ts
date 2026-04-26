import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const platformRoot = join(__dirname, "..", "..");

function readGitignore(): string {
  return readFileSync(join(platformRoot, ".gitignore"), "utf-8");
}

function getGitignoreLines(): string[] {
  return readGitignore()
    .split("\n")
    .map((line) => line.trim());
}

function readPackageJson(): Record<string, unknown> {
  const raw = readFileSync(join(platformRoot, "package.json"), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

describe(".gitignore — report directory exclusions", () => {
  it("WhenReportDirectoryPattern_ThenGitignoreContainsReportSlash", () => {
    const lines = getGitignoreLines();
    expect(lines).toContain("report/");
  });

  it("WhenReportsDirectoryPattern_ThenGitignoreContainsReportsSlash", () => {
    const lines = getGitignoreLines();
    expect(lines).toContain("reports/");
  });

  it("WhenReportAndReportsPatterns_ThenBothAppearOnSeparateLines", () => {
    const lines = getGitignoreLines();
    const reportIndex = lines.indexOf("report/");
    const reportsIndex = lines.indexOf("reports/");
    expect(reportIndex).toBeGreaterThanOrEqual(0);
    expect(reportsIndex).toBeGreaterThanOrEqual(0);
    expect(reportIndex).not.toBe(reportsIndex);
  });

  it("WhenReportPatterns_ThenAppearedAfterCoverageSection", () => {
    const content = readGitignore();
    const coverageIndex = content.indexOf("coverage/");
    const reportIndex = content.indexOf("report/");
    expect(coverageIndex).toBeGreaterThanOrEqual(0);
    expect(reportIndex).toBeGreaterThan(coverageIndex);
  });

  it("WhenGitignore_ThenExistingPatternsArePreserved", () => {
    const lines = getGitignoreLines();
    // Pre-existing patterns that must not have been removed
    expect(lines).toContain("node_modules");
    expect(lines).toContain("coverage/");
    expect(lines).toContain("playwright-report/");
    expect(lines).toContain("test-results/");
    expect(lines).toContain(".env");
  });

  it("WhenReportPattern_ThenItDoesNotMatchUnintendedDirectories", () => {
    // Verify pattern is specifically `report/` (trailing slash = directories only)
    // and not a bare `report` which could match files named 'report'
    const lines = getGitignoreLines();
    expect(lines).toContain("report/");
    expect(lines).not.toContain("report");
  });

  it("WhenReportsPattern_ThenItDoesNotMatchUnintendedPaths", () => {
    const lines = getGitignoreLines();
    expect(lines).toContain("reports/");
    expect(lines).not.toContain("reports");
  });

  it("WhenTestCoverageSection_ThenCommentPrecedesCoverageEntry", () => {
    const content = readGitignore();
    expect(content).toContain("# Test coverage reports");
    const commentIndex = content.indexOf("# Test coverage reports");
    const coverageIndex = content.indexOf("coverage/");
    expect(commentIndex).toBeLessThan(coverageIndex);
  });
});

describe("package.json — @sveltejs/kit version constraint", () => {
  it("WhenSvelteKitDependency_ThenVersionIsAtLeast2571", () => {
    const pkg = readPackageJson();
    const devDeps = pkg.devDependencies as Record<string, string>;
    expect(devDeps["@sveltejs/kit"]).toBe("^2.57.1");
  });

  it("WhenSvelteKitDependency_ThenVersionIsNotDowngradedToPrevious", () => {
    const pkg = readPackageJson();
    const devDeps = pkg.devDependencies as Record<string, string>;
    // The PR specifically reverts from ^2.58.0 to ^2.57.1
    expect(devDeps["@sveltejs/kit"]).not.toBe("^2.58.0");
  });

  it("WhenSvelteKitDependency_ThenItExistsInDevDependencies", () => {
    const pkg = readPackageJson();
    const devDeps = pkg.devDependencies as Record<string, string>;
    expect(devDeps).toHaveProperty("@sveltejs/kit");
  });

  it("WhenSvelteKitDependency_ThenVersionUsesCaretRange", () => {
    const pkg = readPackageJson();
    const devDeps = pkg.devDependencies as Record<string, string>;
    const version = devDeps["@sveltejs/kit"];
    expect(version).toMatch(/^\^/);
  });

  it("WhenPackageJson_ThenOtherDevDependenciesAreUnchanged", () => {
    const pkg = readPackageJson();
    const devDeps = pkg.devDependencies as Record<string, string>;
    // Spot-check sibling SvelteKit ecosystem packages are still present
    expect(devDeps).toHaveProperty("@sveltejs/adapter-node");
    expect(devDeps).toHaveProperty("@sveltejs/vite-plugin-svelte");
  });
});
