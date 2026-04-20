const SENSITIVE_KEYS = [
  "token",
  "password",
  "secret",
  "authorization",
  "cookie",
];

export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
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
