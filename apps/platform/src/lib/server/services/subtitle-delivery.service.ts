import { HTTP_STATUS } from '$lib/constants';
import type { SubtitleMode, SubtitleService } from './subtitle.service';

const SUBTITLE_MODES = ['native', 'translated', 'bilingual'] as const;

export class SubtitleDeliveryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function buildSubtitleResponse(
  videoId: string,
  modeParam: string | null,
  service: SubtitleService,
): Promise<Response> {
  if (!videoId) {
    throw new SubtitleDeliveryError(
      HTTP_STATUS.BAD_REQUEST,
      'Video ID is required',
    );
  }

  const mode = normalizeMode(modeParam);
  const vttContent = await service.generateVtt(videoId, mode);
  if (!vttContent) {
    throw new SubtitleDeliveryError(
      HTTP_STATUS.NOT_FOUND,
      'Subtitles not found',
    );
  }

  return new Response(vttContent, {
    headers: {
      'Content-Type': 'text/vtt',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function normalizeMode(mode: string | null): SubtitleMode {
  if (!mode) {
    return 'native';
  }
  if (isSubtitleMode(mode)) {
    return mode;
  }
  throw new SubtitleDeliveryError(
    HTTP_STATUS.BAD_REQUEST,
    'Invalid subtitle mode',
  );
}

function isSubtitleMode(value: string): value is SubtitleMode {
  return SUBTITLE_MODES.includes(value as SubtitleMode);
}
