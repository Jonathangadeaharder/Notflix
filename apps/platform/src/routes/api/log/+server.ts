import { json } from "@sveltejs/kit";
import { logger } from "$lib/logger";
import type { RequestHandler } from "./$types";
import { HTTP_STATUS } from "$lib/constants";
import { redact } from "$lib/server/utils/redact";

const INVALID_LOG_FORMAT = "Invalid log format";

interface LogRequest {
  level?: string;
  message: string;
  [key: string]: unknown;
}

const LOG_MAP: Record<string, (obj: object, msg: string) => void> = {
  fatal: (obj, msg) => logger.fatal(obj, msg),
  error: (obj, msg) => logger.error(obj, msg),
  warn: (obj, msg) => logger.warn(obj, msg),
  info: (obj, msg) => logger.info(obj, msg),
  debug: (obj, msg) => logger.debug(obj, msg),
  trace: (obj, msg) => logger.trace(obj, msg),
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = (await request.json()) as LogRequest;
    if (!body || typeof body !== "object") {
      return json(
        { success: false, error: INVALID_LOG_FORMAT },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }
    const { level, message, ...rest } = body;

    if (typeof message !== "string" || message.trim().length === 0) {
      return json(
        { success: false, error: INVALID_LOG_FORMAT },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const logFn = LOG_MAP[level || "info"] || LOG_MAP.info;
    logFn(redact(rest), message);

    return json({ success: true });
  } catch (err) {
    console.error("Failed to process client log", err);
    return json(
      { success: false, error: INVALID_LOG_FORMAT },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
};
