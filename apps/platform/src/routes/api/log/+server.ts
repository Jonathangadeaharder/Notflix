import { json } from "@sveltejs/kit";
import { logger } from "$lib/logger";
import type { RequestHandler } from "./$types";

const HTTP_STATUS_BAD_REQUEST = 400;

interface LogRequest {
  level?: string;
  message: string;
  [key: string]: unknown;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = (await request.json()) as LogRequest;
    const { level, message, ...rest } = body;

    const sensitiveKeys = [
      "token",
      "password",
      "secret",
      "authorization",
      "cookie",
    ];

    function redact(obj: Record<string, unknown>): Record<string, unknown> {
      const newObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
          newObj[key] = "[REDACTED]";
        } else if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          newObj[key] = redact(value as Record<string, unknown>);
        } else {
          newObj[key] = value;
        }
      }
      return newObj;
    }

    const cleanedRest = redact(rest);

    const logMap: Record<string, (obj: object, msg: string) => void> = {
      fatal: (obj, msg) => logger.fatal(obj, msg),
      error: (obj, msg) => logger.error(obj, msg),
      warn: (obj, msg) => logger.warn(obj, msg),
      info: (obj, msg) => logger.info(obj, msg),
      debug: (obj, msg) => logger.debug(obj, msg),
      trace: (obj, msg) => logger.trace(obj, msg),
    };

    const logFn = logMap[level || "info"] || logMap.info;
    logFn(cleanedRest, message);

    return json({ success: true });
  } catch (err) {
    console.error("Failed to process client log", err);
    return json(
      { success: false, error: "Invalid log format" },
      { status: HTTP_STATUS_BAD_REQUEST },
    );
  }
};
