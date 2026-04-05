import { CONFIG } from "../infrastructure/config";
import type {
  IAiGateway,
  TranscriptionResponse,
  FilterResponse,
  TranslationResponse,
  ThumbnailResponse,
} from "../domain/interfaces";

class AiServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export class RealAiGateway implements IAiGateway {
  private readonly timeoutMs = CONFIG.AI_SERVICE_TIMEOUT_MS;

  private getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": CONFIG.AI_SERVICE_API_KEY,
    };
    return headers;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async handleResponse(res: Response, context: string) {
    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new AiServiceError(
        res.status,
        `AI Service ${context} Error (${res.status}): ${errorText}`,
      );
    }
    return res.json();
  }

  async transcribe(
    filePath: string,
    lang: string = CONFIG.DEFAULT_TARGET_LANG,
  ): Promise<TranscriptionResponse> {
    const res = await this.fetchWithTimeout(
      `${CONFIG.AI_SERVICE_URL}/transcribe`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ file_path: filePath, language: lang }),
      },
    );
    return this.handleResponse(res, "Transcribe");
  }

  async analyzeBatch(
    texts: string[],
    lang: string = CONFIG.DEFAULT_TARGET_LANG,
  ): Promise<FilterResponse> {
    const res = await this.fetchWithTimeout(`${CONFIG.AI_SERVICE_URL}/filter`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ texts, language: lang }),
    });
    return this.handleResponse(res, "Analyze Batch");
  }

  async translate(
    texts: string[],
    sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResponse> {
    const res = await this.fetchWithTimeout(
      `${CONFIG.AI_SERVICE_URL}/translate`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          texts,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
      },
    );
    return this.handleResponse(res, "Translate");
  }

  async generateThumbnail(filePath: string): Promise<ThumbnailResponse> {
    const res = await this.fetchWithTimeout(
      `${CONFIG.AI_SERVICE_URL}/generate_thumbnail`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ file_path: filePath }),
      },
    );
    return this.handleResponse(res, "Thumbnail");
  }
}
