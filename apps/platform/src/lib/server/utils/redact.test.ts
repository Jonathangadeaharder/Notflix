import { describe, it, expect } from "vitest";
import { redact } from "./redact";

/* eslint-disable sonarjs/no-hardcoded-passwords -- test fixtures for redaction */

const TEST_TIMEOUT_MS = 5000;

describe("redact", () => {
  it(
    "WhenSensitiveKeyPresent_ThenRedactsValue",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({ password: "test-value", username: "alice" });
      expect(result).toEqual({ password: "[REDACTED]", username: "alice" });
    },
  );

  it(
    "WhenSensitiveKeyCaseInsensitive_ThenRedactsValue",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({
        Password: "x",
        TOKEN: "y",
        Secret: "z",
        Authorization: "bearer abc",
        COOKIE: "session=123",
      });
      expect(result).toEqual({
        Password: "[REDACTED]",
        TOKEN: "[REDACTED]",
        Secret: "[REDACTED]",
        Authorization: "[REDACTED]",
        COOKIE: "[REDACTED]",
      });
    },
  );

  it("WhenNullValue_ThenPreservesNull", { timeout: TEST_TIMEOUT_MS }, () => {
    const result = redact({ data: null });
    expect(result).toEqual({ data: null });
  });

  it(
    "WhenArrayValue_ThenPreservesArrayWithoutRecursion",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({ items: [{ password: "inner" }], name: "test" });
      expect(result).toEqual({ items: [{ password: "inner" }], name: "test" });
    },
  );

  it(
    "WhenNestedObject_ThenRecursivelyRedacts",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({
        user: { name: "bob", token: "abc123", meta: { secret: "deep" } },
      });
      expect(result).toEqual({
        user: {
          name: "bob",
          token: "[REDACTED]",
          meta: { secret: "[REDACTED]" },
        },
      });
    },
  );

  it(
    "WhenNoSensitiveKeys_ThenPreservesAll",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({ foo: "bar", count: 42, active: true });
      expect(result).toEqual({ foo: "bar", count: 42, active: true });
    },
  );

  it(
    "WhenEmptyObject_ThenReturnsEmptyObject",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({});
      expect(result).toEqual({});
    },
  );
});
