import type { Subtitle, WordData } from "../components/player/types";

export function parseVTT(vttText: string): Subtitle[] {
    const lines = vttText.split("\n");
    const subs: Subtitle[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("-->")) {
            const timeMatch = lines[i].match(
                /(\d+:\d+:\d+\.\d+)\s-->\s+(\d+:\d+:\d+\.\d+)/,
            );
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
                if (parts.length >= 2) {
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
        parseFloat(parts[0]) * 3600 +
        parseFloat(parts[1]) * 60 +
        parseFloat(parts[2])
    );
}

function parseWords(text: string): WordData[] {
    const words = text.split(" ");
    return words.map((word) => {
        const cleanWord = word
            .replace(/[.,!?;:"'()\[\]]/g, "")
            .toLowerCase();

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
