/**
 * Shared types for Notflix platform
 */

// --- Token Analysis ---
export interface TokenAnalysis {
  text: string;
  lemma: string;
  pos: string;
  is_stop: boolean;
  whitespace?: string;
  translation?: string;
  isKnown?: boolean;
}

// --- VTT Segments ---
export interface VttSegment {
  start: number;
  end: number;
  text: string;
  tokens: TokenAnalysis[];
  classification?: string;
  translation?: string;
}

// --- AI Service Responses ---
export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResponse {
  language: string;
  language_probability: number;
  segments: TranscriptionSegment[];
}

export interface FilterResponse {
  results: TokenAnalysis[][];
}

export interface TranslationResponse {
  translations: string[];
}

export interface ThumbnailResponse {
  thumbnail_path: string;
}

// --- Processing Status ---
export const ProcessingStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  ERROR: "ERROR",
} as const;

export type ProcessingStatusType =
  (typeof ProcessingStatus)[keyof typeof ProcessingStatus];

// --- Progress Stage ---
export const ProgressStage = {
  QUEUED: "QUEUED",
  TRANSCRIBING: "TRANSCRIBING",
  ANALYZING: "ANALYZING",
  TRANSLATING: "TRANSLATING",
  READY: "READY",
  FAILED: "FAILED",
} as const;

export type ProgressStageType =
  (typeof ProgressStage)[keyof typeof ProgressStage];

// --- Segment Classification ---
export const SegmentClassification = {
  EASY: "EASY",
  LEARNING: "LEARNING",
  HARD: "HARD",
} as const;

export type SegmentClassificationType =
  (typeof SegmentClassification)[keyof typeof SegmentClassification];

// --- Language Codes ---
export const Languages = {
  SPANISH: "es",
  ENGLISH: "en",
  FRENCH: "fr",
  GERMAN: "de",
  ITALIAN: "it",
  PORTUGUESE: "pt",
} as const;

export type LanguageCode = (typeof Languages)[keyof typeof Languages];

// --- CEFR Levels ---
export const CefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CefrLevels)[number];

// --- Game Card ---
export interface GameCard {
  lemma: string;
  lang: string;
  original: string;
  contextSentence: string;
  cefr: CefrLevel | string;
  translation: string;
  isKnown: boolean;
}
