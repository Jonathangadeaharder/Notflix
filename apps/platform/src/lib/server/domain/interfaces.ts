import type { components } from '../infrastructure/brain-api';

export type Segment = components['schemas']['Segment'];
export type TranscriptionResponse = components['schemas']['TranscriptionResponse'];
export type TokenAnalysis = components['schemas']['TokenAnalysis'];
export type FilterResponse = components['schemas']['FilterResponse'];
export type TranslationResponse = components['schemas']['TranslationResponse'];
export type ThumbnailResponse = components['schemas']['ThumbnailResponse'];

export interface IAiGateway {
    transcribe(filePath: string, lang?: string): Promise<TranscriptionResponse>;
    analyzeBatch(texts: string[], lang?: string): Promise<FilterResponse>;
    translate(texts: string[], sourceLang: string, targetLang: string): Promise<TranslationResponse>;
    generateThumbnail(filePath: string): Promise<ThumbnailResponse>;
}
