import * as fs from 'node:fs';
import { INDICES } from '$lib/constants';

export function parseLemmasFromCsv(filePath: string): string[] {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  return lines
    .slice(1) // skip header row
    .map((line) => {
      const cols = splitCsvLine(line);
      let lemma = cols[INDICES.SECOND]?.trim();
      if (lemma?.startsWith('"') && lemma?.endsWith('"')) {
        lemma = lemma.slice(1, -1).replace(/""/g, '"');
      }
      return lemma;
    })
    .filter((lemma): lemma is string => !!lemma);
}

export function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current);
  if (inQuotes) {
    throw new Error(`Malformed CSV line with unmatched quote: ${line}`);
  }
  return cols;
}
