import type { Subtitle, WordData } from "../components/player/types";

const TIMESTAMP_REGEX =
  /(\d{2}:\d{2}:\d{2}\.\d{3})\s-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const PUNCTUATION_PATTERN = /[.,!?;:"'()[\]]/g;
const MIN_PARTS_FOR_TRANSLATION = 2;

export function parseVTT(vttText: string): Subtitle[] {
  const lines = vttText.split("\n");
  const subs: Subtitle[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("-->")) {
      const timeMatch = lines[i].match(TIMESTAMP_REGEX);
      if (timeMatch) {
        const start = parseTime(timeMatch[1]);
        const end = parseTime(timeMatch[2]);
        let text = "";
        i++;

        while (i < lines.length && lines[i].trim() !== "") {
          text += lines[i] + " ";
          i++;
        }

        // Split Spanish and English
        const parts = text.trim().split("\n");
        if (parts.length >= MIN_PARTS_FOR_TRANSLATION) {
          subs.push({
            start,
            end,
            text: parts[0],
            translation: parts[1],
            words: parseWords(parts[0]),
          });
        }
      }
    }
  }

  return subs;
}

function parseTime(timeStr: string) {
  const parts = timeStr.split(":");
  return (
    parseFloat(parts[0]) * SECONDS_PER_HOUR +
    parseFloat(parts[1]) * SECONDS_PER_MINUTE +
    parseFloat(parts[2])
  );
}

function parseWords(text: string): WordData[] {
  const words = text.split(" ");
  return words.map((word) => {
    const cleanWord = word.replace(PUNCTUATION_PATTERN, "").toLowerCase();

    // Mock data generation (should be replaced/augmented by knownWords logic in component)
    return {
      text: word,
      difficulty: "easy", // Default, will be overridden by component logic
      lemma: cleanWord,
      translation: getWordTranslation(cleanWord),
      breakdown: getWordBreakdown(cleanWord),
    };
  });
}

// Mock translation lookup
function getWordTranslation(word: string): string {
  const translations: Record<string, string> = {
    el: "the",
    la: "the",
    día: "day",
    del: "of the",
    atraco: "heist",
    estábamos: "we were",
    listos: "ready",
    contarte: "to tell you",
    estoy: "I am",
    aquí: "here",
    historia: "story",
    increíble: "incredible",
    para: "for/to",
    una: "a/an",
  };
  return translations[word] || `(${word})`;
}

// Mock breakdown
function getWordBreakdown(word: string): string {
  const breakdowns: Record<string, string> = {
    contarte: "contar + te (reflexive pronoun)",
    estábamos: "estar (imperfect, 1st person plural)",
    listos: "listo (masculine plural)",
    increíble: "in- + creíble (not believable)",
  };
  return breakdowns[word] || "";
}
