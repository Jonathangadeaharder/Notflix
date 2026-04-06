import { CONFIG } from "../infrastructure/config";
import { getRequestId } from "../request-context";
import type {
  IAiGateway,
  TranscriptionResponse,
  FilterResponse,
  TranslationResponse,
  ThumbnailResponse,
} from "../domain/interfaces";

export class AiServiceError extends Error {
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
  private readonly transcribeTimeoutMs =
    CONFIG.AI_SERVICE_TRANSCRIBE_TIMEOUT_MS;

  private getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": CONFIG.AI_SERVICE_API_KEY,
    };
    const requestId = getRequestId();
    if (requestId) {
      headers["X-Request-ID"] = requestId;
    }
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

  async transcribeWithProgress(
    filePath: string,
    lang: string,
    onProgress: (percent: number) => void | Promise<void>,
  ): Promise<TranscriptionResponse> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.transcribeTimeoutMs,
    );

    let res: Response;
    try {
      res = await fetch(`${CONFIG.AI_SERVICE_URL}/transcribe/stream`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ file_path: filePath, language: lang }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }

    if (!res.ok) {
      clearTimeout(timer);
      const errorText = await res.text().catch(() => res.statusText);
      throw new AiServiceError(
        res.status,
        `AI Service TranscribeStream Error (${res.status}): ${errorText}`,
      );
    }

    const segments: Array<{ start: number; end: number; text: string }> = [];
    let language = lang;
    let languageProbability = 1.0;
    let duration = 0;

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw);
              if (currentEvent === "info" || parsed.type === "info") {
                language = parsed.language ?? language;
                languageProbability = parsed.probability ?? languageProbability;
                duration = parsed.duration ?? duration;
              } else {
                segments.push({
                  start: parsed.start,
                  end: parsed.end,
                  text: parsed.text,
                });
                if (duration > 0) {
                  const lastEnd = parsed.end as number;
                  const rawPercent = Math.round((lastEnd / duration) * 40);
                  await onProgress(Math.min(rawPercent, 40));
                }
              }
            } catch {
              // malformed SSE data — skip
            }
            currentEvent = "";
          }
        }
      }
    } finally {
      reader.releaseLock();
      clearTimeout(timer);
    }

    return { segments, language, language_probability: languageProbability };
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
