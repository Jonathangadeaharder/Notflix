import { json } from '@sveltejs/kit';
import { HTTP_STATUS } from '$lib/constants';
import { eventBus } from '$lib/server/infrastructure/event-bus';
import type { LanguageCode } from '$lib/types';
import type { RequestHandler } from './$types';

interface ProcessRequest {
  targetLang?: string;
  nativeLang?: string;
}

function parseProcessBody(body: unknown): ProcessRequest | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return null;
  const parsed = body as ProcessRequest;
  if (
    (parsed.targetLang !== undefined &&
      typeof parsed.targetLang !== 'string') ||
    (parsed.nativeLang !== undefined && typeof parsed.nativeLang !== 'string')
  )
    return null;
  return parsed;
}

async function parseProcessRequest(request: Request) {
  const body = parseProcessBody(await request.json());
  return body ?? null;
}

function handleProcessError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Processing API Error:', message);
  return json(
    { error: 'Internal server error' },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
  );
}

function validateLanguageFields(
  body: ProcessRequest,
): { targetLang: string; nativeLang: string } | Response {
  const targetLang = body.targetLang?.trim();
  const nativeLang = body.nativeLang?.trim();
  if (
    !targetLang ||
    targetLang.length === 0 ||
    !nativeLang ||
    nativeLang.length === 0
  ) {
    return json(
      { error: 'Invalid language code' },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
  return { targetLang, nativeLang };
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    return json(
      { error: 'Unauthorized' },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  if (!params.id) {
    return json(
      { error: 'Missing videoId' },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  let body: ProcessRequest | null;
  try {
    body = await parseProcessRequest(request);
  } catch (err) {
    return handleProcessError(err);
  }

  if (!body) {
    return json(
      { error: 'Invalid request body' },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const langs = validateLanguageFields(body);
  if (langs instanceof Response) return langs;

  eventBus
    .emitAsync('video.processing.started', {
      videoId: params.id,
      targetLang: langs.targetLang as LanguageCode,
      nativeLang: langs.nativeLang as LanguageCode,
      userId: session.user.id,
    })
    .catch((err) =>
      console.error(`[Pipeline] Background error for ${params.id}:`, err),
    );

  return json({ success: true, message: 'Processing started in background' });
};
