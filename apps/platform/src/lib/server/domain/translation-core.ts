import type { TranscriptionResponse, TokenAnalysis } from './interfaces';

export type VttSegment = {
    start: number;
    end: number;
    text: string;
    tokens: TokenAnalysis[];
    translation?: string;
    classification?: string;
};

export function mapAnalysisToSegments(transcription: TranscriptionResponse, batchAnalysis: any[]): VttSegment[] {
    return transcription.segments.map((seg, i) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
        tokens: batchAnalysis[i]
    }));
}

export function extractUniqueLemmas(segments: VttSegment[], limit?: number): string[] {
    const unique = new Set<string>();
    segments.forEach(seg => seg.tokens.forEach(t => {
        if (!t.is_stop && t.pos !== 'PUNCT') unique.add(t.lemma);
    }));
    const arr = Array.from(unique);
    return limit ? arr.slice(0, limit) : arr;
}

export function extractUnknownLemmas(segments: VttSegment[]): string[] {
    const unique = new Set<string>();
    segments.forEach(seg => seg.tokens.forEach(t => {
        if (!(t as any).isKnown) unique.add(t.lemma);
    }));
    return Array.from(unique);
}

export function mapTranslationsToSegments(
    segments: VttSegment[],
    lemmaList: string[],
    lemmaTranslations: string[],
    sentenceTranslations: string[]
): VttSegment[] {
    const lemmaMap = new Map(lemmaList.map((l, i) => [l, lemmaTranslations[i]]));

    return segments.map((seg, i) => ({
        ...seg,
        translation: sentenceTranslations[i],
        tokens: seg.tokens.map(t => ({
            ...t,
            translation: lemmaMap.get(t.lemma) || (t as any).translation
        }))
    }));
}
