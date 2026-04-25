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
    "WhenArrayValue_ThenRecursivelyRedacts",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({ items: [{ password: "inner" }], name: "test" });
      expect(result).toEqual({
        items: [{ password: "[REDACTED]" }],
        name: "test",
      });
    },
  );

  it(
    "WhenArrayWithNestedObjects_ThenRedactsAll",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({
        data: [
          { token: "a", safe: "x" },
          { secret: "b", name: "y" },
        ],
      });
      expect(result).toEqual({
        data: [
          { token: "[REDACTED]", safe: "x" },
          { secret: "[REDACTED]", name: "y" },
        ],
      });
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

  it("WhenDateValue_ThenPreservesDate", { timeout: TEST_TIMEOUT_MS }, () => {
    const date = new Date("2024-01-01");
    const result = redact({ timestamp: date, name: "test" });
    expect(result.timestamp).toBe(date);
    expect(result.name).toBe("test");
  });

  it(
    "WhenCompoundSensitiveKey_ThenRedactsValue",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      const result = redact({
        accessToken: "abc",
        refreshToken: "def",
        auth_token: "ghi",
        "set-cookie": "session=xyz",
        safeField: "ok",
      });
      expect(result.accessToken).toBe("[REDACTED]");
      expect(result.refreshToken).toBe("[REDACTED]");
      expect(result.auth_token).toBe("[REDACTED]");
      expect(result["set-cookie"]).toBe("[REDACTED]");
      expect(result.safeField).toBe("ok");
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

  it("WhenCalled_ThenDoesNotMutateInput", { timeout: TEST_TIMEOUT_MS }, () => {
    const input = {
      password: "secret",
      nested: { token: "abc", safe: "ok" },
      items: [{ authorization: "Bearer x" }],
    };
    const snapshot = structuredClone(input);

    redact(input);

    expect(input).toEqual(snapshot);
  });
});
