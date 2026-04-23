import { CONFIG } from "../infrastructure/config";
import { getRequestId } from "../request-context";
import type {
  TranscriptionResponse,
  FilterResponse,
  TranslationResponse,
  ThumbnailResponse,
} from "$lib/types";

export type {
  TranscriptionResponse,
  FilterResponse,
  TranslationResponse,
  ThumbnailResponse,
};

const SSE_EVENT_PREFIX = "event:";
const SSE_DATA_PREFIX = "data:";
const TRANSCRIBE_PROGRESS_CAP_PERCENT = 80;

export class AiServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

type SSEStreamState = {
  segments: Array<{ start: number; end: number; text: string }>;
  language: string;
  languageProbability: number;
  duration: number;
};

function applyInfoEvent(
  parsed: Record<string, unknown>,
  state: SSEStreamState,
): void {
  state.language = (parsed.language as string) ?? state.language;
  state.languageProbability =
    (parsed.probability as number) ?? state.languageProbability;
  state.duration = (parsed.duration as number) ?? state.duration;
}

function applySegmentEvent(
  parsed: Record<string, unknown>,
  state: SSEStreamState,
  onProgress: (percent: number) => void | Promise<void>,
): void {
  state.segments.push({
    start: parsed.start as number,
    end: parsed.end as number,
    text: parsed.text as string,
  });
  if (state.duration > 0) {
    const rawPercent = Math.round(
      ((parsed.end as number) / state.duration) *
        TRANSCRIBE_PROGRESS_CAP_PERCENT,
    );
    onProgress(Math.min(rawPercent, TRANSCRIBE_PROGRESS_CAP_PERCENT));
  }
}

function processSSELine(
  line: string,
  currentEvent: string,
  state: SSEStreamState,
  onProgress: (percent: number) => void | Promise<void>,
): string {
  if (line.startsWith("event:")) {
    return line.slice(SSE_EVENT_PREFIX.length).trim();
  }
  if (!line.startsWith(SSE_DATA_PREFIX)) return currentEvent;
  const raw = line.slice(SSE_DATA_PREFIX.length).trim();
  if (!raw || raw === "[DONE]") return currentEvent;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (currentEvent === "info" || parsed.type === "info") {
      applyInfoEvent(parsed, state);
    } else {
      applySegmentEvent(parsed, state, onProgress);
    }
  } catch {
    /* skip */
  }
  return "";
}

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  state: SSEStreamState,
  onProgress: (percent: number) => void | Promise<void>,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        currentEvent = processSSELine(line, currentEvent, state, onProgress);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export class RealAiGateway {
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

    const res = await this.fetchTranscriptionStream(
      filePath,
      lang,
      controller.signal,
    );

    if (!res.ok) {
      clearTimeout(timer);
      const errorText = await res.text().catch(() => res.statusText);
      throw new AiServiceError(
        res.status,
        `AI Service TranscribeStream Error (${res.status}): ${errorText}`,
      );
    }

    if (!res.body) throw new Error("AI Service response body is null");

    try {
      const result = await this.processTranscriptionSSE(
        res.body,
        onProgress,
        lang,
      );
      return {
        segments: result.segments,
        language: result.language,
        language_probability: result.languageProbability,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchTranscriptionStream(
    filePath: string,
    lang: string,
    signal: AbortSignal,
  ): Promise<Response> {
    return fetch(`${CONFIG.AI_SERVICE_URL}/transcribe/stream`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ file_path: filePath, language: lang }),
      signal,
    });
  }

  private async processTranscriptionSSE(
    body: ReadableStream<Uint8Array>,
    onProgress: (percent: number) => void | Promise<void>,
    lang: string,
  ): Promise<{
    segments: Array<{ start: number; end: number; text: string }>;
    language: string;
    languageProbability: number;
  }> {
    const state: SSEStreamState = {
      segments: [],
      language: lang,
      languageProbability: 1.0,
      duration: 0,
    };
    await readSSEStream(body, state, onProgress);
    return {
      segments: state.segments,
      language: state.language,
      languageProbability: state.languageProbability,
    };
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
