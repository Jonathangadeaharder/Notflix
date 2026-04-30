import { json } from '@sveltejs/kit';
import { HTTP_STATUS } from '$lib/constants';
import { deleteVideoAndAssets } from '$lib/server/services/delete-video.service';
import type { RequestHandler } from './$types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DELETE: RequestHandler = async ({ params }) => {
  const { id } = params;

  if (!UUID_RE.test(id)) {
    return json(
      { error: 'Invalid video ID: must be a valid UUID' },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  try {
    const result = await deleteVideoAndAssets(id);

    if (!result.ok) {
      if (result.reason === 'NOT_FOUND') {
        return json(
          { error: 'Video not found' },
          { status: HTTP_STATUS.NOT_FOUND },
        );
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error('[Delete] Operation failed:', err);
    return json(
      { error: 'Failed to delete video' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
};
