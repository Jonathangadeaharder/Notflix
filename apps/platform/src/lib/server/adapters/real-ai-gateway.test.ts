import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiServiceError, RealAiGateway } from './real-ai-gateway';

const TEST_AI_URL = 'http://test-ai:8000';

// Mock config
vi.mock('../infrastructure/config', () => ({
  CONFIG: {
    AI_SERVICE_URL: 'http://test-ai:8000',
    AI_SERVICE_API_KEY: 'test-key',
    AI_SERVICE_TIMEOUT_MS: 5000,
    AI_SERVICE_TRANSCRIBE_TIMEOUT_MS: 30000,
    DEFAULT_TARGET_LANG: 'es',
  },
}));

// Mock request context
vi.mock('../request-context', () => ({
  getRequestId: vi.fn(() => 'req-123'),
}));

function mockFetch(response: object) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    }),
  );
}

function createSSEStream(chunks: string[]) {
  const encoder = new TextEncoder();
  let chunkIndex = 0;
  return {
    getReader: () => ({
      read: vi.fn().mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          return Promise.resolve({
            done: false,
            value: encoder.encode(chunks[chunkIndex++]),
          });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
      releaseLock: vi.fn(),
    }),
  };
}

const HTTP_SERVER_ERROR = 500;

describe('RealAiGateway: successful calls', () => {
  let gateway: RealAiGateway;

  beforeEach(() => {
    vi.restoreAllMocks();
    gateway = new RealAiGateway();
  });

  it('transcribes with correct URL and headers', async () => {
    const mockResponse = {
      segments: [],
      language: 'es',
      language_probability: 0.99,
    };
    mockFetch(mockResponse);

    const result = await gateway.transcribe('/path/file.mp3', 'es');
    expect(result).toEqual(mockResponse);

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[0]).toBe(`${TEST_AI_URL}/transcribe`);

    const headers = (fetchCall[1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers['X-API-Key']).toBe('test-key');
    expect(headers['X-Request-ID']).toBe('req-123');
  });

  it('calls analyzeBatch correctly', async () => {
    mockFetch({ results: [[]] });
    await expect(gateway.analyzeBatch(['hello'], 'es')).resolves.toEqual({
      results: [[]],
    });
  });

  it('calls translate correctly', async () => {
    mockFetch({ translations: ['hola'] });
    await expect(gateway.translate(['hello'], 'en', 'es')).resolves.toEqual({
      translations: ['hola'],
    });
  });

  it('calls generateThumbnail correctly', async () => {
    mockFetch({ thumbnail_path: 'thumb.jpg' });
    await expect(gateway.generateThumbnail('/path/video.mp4')).resolves.toEqual(
      { thumbnail_path: 'thumb.jpg' },
    );
  });
});

describe('RealAiGateway: error handling', () => {
  it('throws AiServiceError on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: HTTP_SERVER_ERROR,
        text: () => Promise.resolve('GPU out of memory'),
        statusText: 'Internal Server Error',
      }),
    );

    const gateway = new RealAiGateway();
    await expect(gateway.transcribe('/path/file.mp3')).rejects.toThrow(
      AiServiceError,
    );
  });

  it('throws AiServiceError on non-ok transcribeWithProgress', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
        statusText: 'Service Unavailable',
      }),
    );

    const gateway = new RealAiGateway();
    await expect(
      gateway.transcribeWithProgress('/path/file.mp3', 'es', vi.fn()),
    ).rejects.toThrow(AiServiceError);
  });

  it('throws when response body is null in transcribeWithProgress', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      }),
    );

    const gateway = new RealAiGateway();
    await expect(
      gateway.transcribeWithProgress('/path/file.mp3', 'es', vi.fn()),
    ).rejects.toThrow('response body is null');
  });

  it('rethrows fetch errors in transcribeWithProgress', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    const gateway = new RealAiGateway();
    await expect(
      gateway.transcribeWithProgress('/path/file.mp3', 'es', vi.fn()),
    ).rejects.toThrow('Network error');
  });
});

describe('RealAiGateway: SSE streaming', () => {
  let gateway: RealAiGateway;

  beforeEach(() => {
    vi.restoreAllMocks();
    gateway = new RealAiGateway();
  });

  it('parses SSE events and returns segments', async () => {
    const sseChunks = [
      'event:info\ndata:{"type":"info","language":"es","probability":0.95,"duration":10}\n\n' +
        'data:{"start":0,"end":3,"text":"Hola"}\n\n' +
        'data:{"start":3,"end":6,"text":"mundo"}\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream(sseChunks),
      }),
    );

    const progressCallback = vi.fn();
    const result = await gateway.transcribeWithProgress(
      '/path/file.mp3',
      'es',
      progressCallback,
    );

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({ start: 0, end: 3, text: 'Hola' });
    expect(result.language).toBe('es');
    expect(result.language_probability).toBe(0.95);
  });

  it('calls onProgress with calculated percentage', async () => {
    const sseChunks = [
      'event:info\ndata:{"type":"info","duration":100}\n\n' +
        'data:{"start":0,"end":50,"text":"first half"}\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream(sseChunks),
      }),
    );

    const progressCallback = vi.fn();
    await gateway.transcribeWithProgress(
      '/path/file.mp3',
      'es',
      progressCallback,
    );

    expect(progressCallback).toHaveBeenCalledWith(40); // (50/100)*80 = 40
  });

  it('caps progress at 80 percent', async () => {
    const sseChunks = [
      'event:info\ndata:{"type":"info","duration":10}\n\n' +
        'data:{"start":0,"end":20,"text":"overflow"}\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream(sseChunks),
      }),
    );

    const progressCallback = vi.fn();
    await gateway.transcribeWithProgress(
      '/path/file.mp3',
      'es',
      progressCallback,
    );

    expect(progressCallback).toHaveBeenCalledWith(80);
  });

  it('skips malformed SSE data lines', async () => {
    const sseChunks = [
      'event:info\ndata:{"type":"info","duration":10}\n\n' +
        'data:{"start":0,"end":5,"text":"valid"}\n\n' +
        'data:not-json\n\n' +
        'data:{"start":5,"end":10,"text":"also valid"}\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream(sseChunks),
      }),
    );

    const result = await gateway.transcribeWithProgress(
      '/path/file.mp3',
      'es',
      vi.fn(),
    );

    expect(result.segments).toHaveLength(2);
  });

  it('skips DONE sentinel', async () => {
    const sseChunks = [
      'data:{"start":0,"end":5,"text":"done"}\n\ndata:[DONE]\n\n',
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream(sseChunks),
      }),
    );

    const result = await gateway.transcribeWithProgress(
      '/path/file.mp3',
      'es',
      vi.fn(),
    );

    expect(result.segments).toHaveLength(1);
  });

  it('handles empty data lines', async () => {
    const sseChunks = ['data:{"start":0,"end":5,"text":"ok"}\n\ndata:\n\n'];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream(sseChunks),
      }),
    );

    const result = await gateway.transcribeWithProgress(
      '/path/file.mp3',
      'es',
      vi.fn(),
    );

    expect(result.segments).toHaveLength(1);
  });
});
