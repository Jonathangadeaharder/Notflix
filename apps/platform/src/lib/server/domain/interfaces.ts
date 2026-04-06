import type { components } from "../infrastructure/brain-api";

export type TranscriptionResponse =
  components["schemas"]["TranscriptionResponse"];
export type TokenAnalysis = components["schemas"]["TokenAnalysis"];
export type FilterResponse = components["schemas"]["FilterResponse"];
export type TranslationResponse = components["schemas"]["TranslationResponse"];
export type ThumbnailResponse = components["schemas"]["ThumbnailResponse"];

export interface IAiGateway {
  transcribe(filePath: string, lang?: string): Promise<TranscriptionResponse>;
  transcribeWithProgress(
    filePath: string,
    lang: string,
    onProgress: (percent: number) => void | Promise<void>,
  ): Promise<TranscriptionResponse>;
  analyzeBatch(texts: string[], lang?: string): Promise<FilterResponse>;
  translate(
    texts: string[],
    sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResponse>;
  generateThumbnail(filePath: string): Promise<ThumbnailResponse>;
}

export type DomainVideo = {
  id: string;
  title: string;
  filePath: string;
  duration: number | null;
  published: boolean;
};

export interface IVideoRepository {
  getVideoById(id: string): Promise<DomainVideo | null>;
  saveVideo(video: Partial<DomainVideo>): Promise<DomainVideo>;
  deleteVideo(id: string): Promise<void>;
}
