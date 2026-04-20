import { describe, it, expect, vi } from "vitest";

const mockReadFileSync =
  vi.fn<(filePath: string, encoding: string) => string>();

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: mockReadFileSync,
  };
});

const { splitCsvLine, parseLemmasFromCsv } = await import("./seed-csv");

const CSV_TIMEOUT_MS = 5_000;

describe("splitCsvLine", () => {
  it(
    "WhenNormalCsvLine_ThenSplitsOnCommas",
    () => {
      const result = splitCsvLine("apple,banana,cherry");
      expect(result).toEqual(["apple", "banana", "cherry"]);
    },
    CSV_TIMEOUT_MS,
  );

  it(
    "WhenQuotedFieldContainsCommas_ThenCommasPreserved",
    () => {
      const result = splitCsvLine('hello,"world, how, are, you",end');
      expect(result).toEqual(["hello", '"world, how, are, you"', "end"]);
    },
    CSV_TIMEOUT_MS,
  );

  it(
    "WhenEmptyInput_ThenReturnsSingleEmptyField",
    () => {
      const result = splitCsvLine("");
      expect(result).toEqual([""]);
    },
    CSV_TIMEOUT_MS,
  );

  it(
    "WhenQuotesAreEscapedAsDoubled_ThenQuotesKeptInField",
    () => {
      // splitCsvLine is a simple toggle parser — each " flips inQuotes state,
      // so doubled quotes stay in the field and the closing " is part of it.
      const result = splitCsvLine('"say ""hello""",plain');
      expect(result).toEqual(['"say ""hello"""', "plain"]);
    },
    CSV_TIMEOUT_MS,
  );
});

describe("parseLemmasFromCsv", () => {
  it(
    "WhenValidCsvContent_ThenExtractsSecondColumnLemmas",
    () => {
      mockReadFileSync.mockReturnValue(
        "German_Lemma,Spanish_Translation\nHaus,casa\nBuch,libro\n",
      );

      const result = parseLemmasFromCsv("/fake/path.csv");

      expect(result).toEqual(["casa", "libro"]);
    },
    CSV_TIMEOUT_MS,
  );

  it(
    "WhenQuotedTranslationWithEscapedQuotes_ThenUnquotesAndUnescapes",
    () => {
      mockReadFileSync.mockReturnValue(
        'German_Lemma,Spanish_Translation\nWort,"decir ""algo"""\n',
      );

      const result = parseLemmasFromCsv("/fake/path.csv");

      expect(result).toEqual(['decir "algo"']);
    },
    CSV_TIMEOUT_MS,
  );

  it(
    "WhenEmptyLinesAndMissingTranslations_ThenFiltersThemOut",
    () => {
      mockReadFileSync.mockReturnValue(
        "German_Lemma,Spanish_Translation\nHaus,casa\n\nBuch,\n",
      );

      const result = parseLemmasFromCsv("/fake/path.csv");

      expect(result).toEqual(["casa"]);
    },
    CSV_TIMEOUT_MS,
  );
});
