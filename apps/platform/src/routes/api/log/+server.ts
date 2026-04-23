import { json } from "@sveltejs/kit";
import { logger } from "$lib/logger";
import type { RequestHandler } from "./$types";
import { HTTP_STATUS } from "$lib/constants";

interface LogRequest {
  level?: string;
  message: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = [
  "token",
  "password",
  "secret",
  "authorization",
  "cookie",
];

const REDACTED = "[REDACTED]";

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      newObj[key] = REDACTED;
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
    const { level, message, ...rest } = body;

    const logFn = LOG_MAP[level || "info"] || LOG_MAP.info;
    logFn(redact(rest), message);

    return json({ success: true });
  } catch (err) {
    console.error("Failed to process client log", err);
    return json(
      { success: false, error: "Invalid log format" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
};
