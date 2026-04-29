/**
 * Reverse proxy for Supabase Auth (GoTrue) in E2E tests.
 *
 * The Supabase JS SDK sends requests to `${SUPABASE_URL}/auth/v1/*`.
 * GoTrue serves at the root path. This proxy strips the `/auth/v1` prefix
 * and forwards to GoTrue, mimicking what Kong does in production.
 *
 * Usage: node tests/e2e/auth-proxy.js [port] [gotrue-port]
 * Default ports: 8002 → GoTrue on 9999
 */
// @ts-nocheck — lightweight test utility

import http from 'node:http';

const PORT = parseInt(process.argv[2] || '8002', 10);
const GOTRUE_PORT = parseInt(process.argv[3] || '9999', 10);
const GOTRUE_HOST = '127.0.0.1';
const AUTH_PREFIX = '/auth/v1';
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;
const HTTP_NO_CONTENT = 204;

function buildCorsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

function handleProxyResponse(req, res, proxyRes) {
  const responseHeaders = { ...buildCorsHeaders(req) };
  for (const [key, value] of Object.entries(proxyRes.headers)) {
    const lower = key.toLowerCase();
    if (lower.startsWith('access-control-')) continue;
    if (lower === 'transfer-encoding') continue;
    responseHeaders[key] = value;
  }

  res.writeHead(proxyRes.statusCode || HTTP_INTERNAL_ERROR, responseHeaders);
  proxyRes.pipe(res);
}

function proxyRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname, search } = url;

  if (!pathname.startsWith(AUTH_PREFIX)) {
    res.writeHead(HTTP_NOT_FOUND, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  const targetPath = pathname.slice(AUTH_PREFIX.length) || '/';
  const targetUrl = `http://${GOTRUE_HOST}:${GOTRUE_PORT}${targetPath}${search}`;

  const proxyHeaders = { ...req.headers };
  // biome-ignore lint/complexity/useLiteralKeys: dynamic host header
  delete proxyHeaders['host'];
  // biome-ignore lint/complexity/useLiteralKeys: dynamic host header
  proxyHeaders['host'] = `${GOTRUE_HOST}:${GOTRUE_PORT}`;

  const proxyReq = http.request(
    targetUrl,
    { method: req.method, headers: proxyHeaders },
    (proxyRes) => handleProxyResponse(req, res, proxyRes),
  );

  proxyReq.on('error', (err) => {
    console.error(`[Auth Proxy] Error forwarding to GoTrue: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(HTTP_BAD_GATEWAY, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'auth service unavailable' }));
    }
  });

  req.pipe(proxyReq);
}

function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(HTTP_NO_CONTENT, buildCorsHeaders(req));
    res.end();
    return;
  }

  proxyRequest(req, res);
}

const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log(
    `[Auth Proxy] Listening on http://localhost:${PORT} → GoTrue at ${GOTRUE_HOST}:${GOTRUE_PORT}`,
  );
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
