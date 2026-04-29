const SENSITIVE_PATTERNS = [
  'token',
  'password',
  'secret',
  'authorization',
  'cookie',
  'apikey',
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SENSITIVE_PATTERNS.some((p) => normalized.includes(p));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (isPlainObject(value)) {
    return redact(value);
  }
  return value;
}

export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const newObj = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      newObj[key] = '[REDACTED]';
    } else {
      newObj[key] = redactValue(value);
    }
  }
  return newObj;
}
