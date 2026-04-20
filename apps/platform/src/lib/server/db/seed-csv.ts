import * as fs from "node:fs";

export function parseLemmasFromCsv(filePath: string): string[] {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  return lines
    .slice(1) // skip header row
    .map((line) => {
      const cols = splitCsvLine(line);
      let lemma = cols[1]?.trim();
      if (lemma?.startsWith('"') && lemma?.endsWith('"')) {
        lemma = lemma.slice(1, -1).replace(/""/g, '"');
      }
      return lemma;
    })
    .filter((lemma): lemma is string => !!lemma);
}

export function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "," && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cols.push(current);
  return cols;
}
