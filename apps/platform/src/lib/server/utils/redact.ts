const SENSITIVE_KEYS = new Set([
  "token",
  "password",
  "secret",
  "authorization",
  "cookie",
]);

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value !== null && typeof value === "object") {
    return redact(value as Record<string, unknown>);
  }
  return value;
}

export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      newObj[key] = "[REDACTED]";
    } else {
      newObj[key] = redactValue(value);
    }
  }
  return newObj;
}
