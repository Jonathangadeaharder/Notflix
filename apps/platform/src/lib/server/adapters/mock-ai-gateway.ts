import type {
  IAiGateway,
  TranscriptionResponse,
  FilterResponse,
  TranslationResponse,
  ThumbnailResponse,
} from "../domain/interfaces";

export class MockAiGateway implements IAiGateway {
  async transcribe(filePath: string): Promise<TranscriptionResponse> {
    console.log(`[MockAiGateway] Transcribing ${filePath}...`);
    return {
      segments: [
        { start: 0, end: 5, text: "This is a mock transcription segment." },
        {
          start: 5,
          end: 10,
          text: "The linguistics service is currently bypassed.",
        },
      ],
      language: "en",
      language_probability: 1.0,
    };
  }

  async transcribeWithProgress(
    filePath: string,
    _lang: string,
    onProgress: (percent: number) => void | Promise<void>,
  ): Promise<TranscriptionResponse> {
    console.log(`[MockAiGateway] transcribeWithProgress ${filePath}...`);
    await onProgress(20);
    await onProgress(40);
    return await this.transcribe(filePath);
  }

  async analyzeBatch(texts: string[]): Promise<FilterResponse> {
    return {
      results: texts.map(() => [
        { text: "Mock", lemma: "mock", pos: "NOUN", is_stop: false },
      ]),
    };
  }

  async translate(
    texts: string[],
    _sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResponse> {
    console.log(`[MockAiGateway] Translating ${texts.length} texts...`);
    return {
      translations: texts.map((t) => `[${targetLang}] ${t}`),
    };
  }

  async generateThumbnail(filePath: string): Promise<ThumbnailResponse> {
    console.log(`[MockAiGateway] Generating thumbnail for ${filePath}...`);
    return {
      thumbnail_path: "thumbnails/mock_thumb.jpg",
    };
  }
}
