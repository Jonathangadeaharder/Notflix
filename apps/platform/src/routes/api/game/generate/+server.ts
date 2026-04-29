import { json } from '@sveltejs/kit';
import { HTTP_STATUS } from '$lib/constants';
import { generateDeck } from '$lib/server/services/chunker.service';
import type { RequestHandler } from './$types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_END_TIME = 600;

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    return json(
      { error: 'Unauthorized' },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }
  const userId = session.user.id;

  const videoId = url.searchParams.get('videoId');
  const start = parseInt(url.searchParams.get('start') || '0', 10);
  const end = parseInt(
    url.searchParams.get('end') || DEFAULT_END_TIME.toString(),
    10,
  );
  const targetLang = url.searchParams.get('targetLang') || 'es';

  if (!videoId) {
    return json(
      { error: 'Missing videoId' },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  if (!UUID_RE.test(videoId)) {
    return json(
      { error: 'videoId must be a valid UUID' },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const cards = await generateDeck(userId, videoId, start, end, targetLang);

  console.log(
    `[API] Generated ${cards.length} cards for video ${videoId} (chunk ${start}-${end}s)`,
  );

  return json({
    nextChunkStart: end,
    cards,
  });
};
