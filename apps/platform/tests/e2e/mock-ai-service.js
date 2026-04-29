/**
 * Lightweight mock AI service for E2E tests.
 *
 * Responds to all AI service endpoints with pre-canned data so the platform
 * video pipeline completes without a real Python/FastAPI backend.
 *
 * Usage: node tests/e2e/mock-ai-service.js [port]
 * Default port: 8001 (avoids conflict with Docker AI service on 8000)
 */
// @ts-nocheck — lightweight test utility; JSDoc annotations not required

import http from 'node:http';

const PORT = parseInt(process.argv[2] || '8001', 10);
const API_KEY = process.env.AI_SERVICE_API_KEY || 'dev_secret_key';

// ---------- Canned responses ----------

const TRANSCRIPTION_RESPONSE = {
  segments: [
    { start: 0, end: 2, text: 'Hola mundo' },
    { start: 2, end: 4, text: 'Cómo estás' },
    { start: 4, end: 6, text: 'Muy bien gracias' },
  ],
  language: 'es',
  language_probability: 0.99,
};

const FILTER_RESPONSE = {
  results: [
    [
      {
        text: 'Hola',
        lemma: 'hola',
        pos: 'INTJ',
        is_stop: false,
        whitespace: ' ',
        translation: null,
      },
      {
        text: 'mundo',
        lemma: 'mundo',
        pos: 'NOUN',
        is_stop: false,
        whitespace: '',
        translation: null,
      },
    ],
    [
      {
        text: 'Cómo',
        lemma: 'cómo',
        pos: 'ADV',
        is_stop: true,
        whitespace: ' ',
        translation: null,
      },
      {
        text: 'estás',
        lemma: 'estar',
        pos: 'VERB',
        is_stop: false,
        whitespace: '',
        translation: null,
      },
    ],
    [
      {
        text: 'Muy',
        lemma: 'muy',
        pos: 'ADV',
        is_stop: true,
        whitespace: ' ',
        translation: null,
      },
      {
        text: 'bien',
        lemma: 'bien',
        pos: 'ADV',
        is_stop: false,
        whitespace: ' ',
        translation: null,
      },
      {
        text: 'gracias',
        lemma: 'gracia',
        pos: 'NOUN',
        is_stop: false,
        whitespace: '',
        translation: null,
      },
    ],
  ],
};

const TRANSLATE_RESPONSE = {
  translations: ['Hello world', 'How are you', 'Very well thanks'],
};

const THUMBNAIL_RESPONSE = {
  thumbnail_path: '/app/media/uploads/mock-thumbnail.jpg',
};

// ---------- Helpers ----------

function authenticate(req) {
  if (!API_KEY) return true;
  const key = req.headers['x-api-key'];
  return key === API_KEY;
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// ---------- SSE streaming for /transcribe/stream ----------

function handleTranscribeStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const info = `event:info\ndata:${JSON.stringify({
    type: 'info',
    language: 'es',
    probability: 0.99,
    duration: 6,
  })}\n\n`;
  res.write(info);

  const segments = TRANSCRIPTION_RESPONSE.segments;
  let i = 0;
  let cleanedUp = false;
  const interval = setInterval(() => {
    if (cleanedUp) return;
    if (i < segments.length) {
      const seg = segments[i];
      res.write(`data:${JSON.stringify(seg)}\n\n`);
      i++;
    } else {
      res.write('data:[DONE]\n\n');
      clearInterval(interval);
      res.end();
    }
  }, 50);
  req.on('close', () => {
    cleanedUp = true;
    clearInterval(interval);
  });
}

// ---------- Route handler ----------

async function handler(req, res) {
  const { method } = req;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // Health — no auth required
  if (method === 'GET' && path === '/health') {
    json(res, 200, { status: 'ai_service_active', gpu: false });
    return;
  }

  // Auth check for everything else
  if (!authenticate(req)) {
    json(res, 401, { detail: 'Invalid API key' });
    return;
  }

  // Transcribe (JSON)
  if (method === 'POST' && path === '/transcribe') {
    json(res, 200, TRANSCRIPTION_RESPONSE);
    return;
  }

  // Transcribe with SSE streaming
  if (method === 'POST' && path === '/transcribe/stream') {
    handleTranscribeStream(req, res);
    return;
  }

  // Filter (analyze batch)
  if (method === 'POST' && path === '/filter') {
    const body = await readBody(req);
    const texts = body.texts || [];
    // Return one filter result per input text
    const results = texts.map(
      (_, i) => FILTER_RESPONSE.results[i % FILTER_RESPONSE.results.length],
    );
    json(res, 200, { results });
    return;
  }

  // Translate
  if (method === 'POST' && path === '/translate') {
    const body = await readBody(req);
    const texts = body.texts || [];
    const translations = texts.map(
      (_, i) =>
        TRANSLATE_RESPONSE.translations[
          i % TRANSLATE_RESPONSE.translations.length
        ],
    );
    json(res, 200, { translations });
    return;
  }

  // Generate thumbnail
  if (method === 'POST' && path === '/generate_thumbnail') {
    json(res, 200, THUMBNAIL_RESPONSE);
    return;
  }

  json(res, 404, { detail: 'Not found' });
}

// ---------- Start ----------

const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log(`[Mock AI Service] Listening on http://localhost:${PORT}`);
  console.log(`[Mock AI Service] API key: ${API_KEY ? 'enabled' : 'disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
