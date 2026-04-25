import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// --- Spec: apps/ai-service/openapi.json ---
// Smoke test: verifies the OpenAPI schema has expected structure and fields.
// Does NOT validate TypeScript types against the schema.

interface OpenApiSchema {
  components: {
    schemas: Record<string, any>;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openApiPath = join(
  __dirname,
  "../../../../../../apps/ai-service/openapi.json",
);
let openApi: OpenApiSchema;

function loadOpenApi(): OpenApiSchema {
  if (!openApi) {
    openApi = JSON.parse(readFileSync(openApiPath, "utf-8"));
  }
  return openApi;
}

describe("AI Service OpenAPI Smoke Test", () => {
  it("WhenTranscribeResponse_ThenMatchesOpenApiSchema", () => {
    const schema = loadOpenApi().components.schemas.TranscriptionResponse;
    expect(schema.required).toEqual(
      expect.arrayContaining(["segments", "language", "language_probability"]),
    );
    expect(schema.properties.segments.type).toBe("array");
    expect(schema.properties.language.type).toBe("string");
    expect(schema.properties.language_probability.type).toBe("number");
  });

  it("WhenFilterResponse_ThenMatchesOpenApiSchema", () => {
    const schema = loadOpenApi().components.schemas.FilterResponse;
    expect(schema.required).toEqual(expect.arrayContaining(["results"]));
    expect(schema.properties.results.type).toBe("array");
    // results is an array of arrays of TokenAnalysis
    expect(schema.properties.results.items.type).toBe("array");
  });

  it("WhenTranslateResponse_ThenMatchesOpenApiSchema", () => {
    const schema = loadOpenApi().components.schemas.TranslationResponse;
    expect(schema.required).toEqual(expect.arrayContaining(["translations"]));
    expect(schema.properties.translations.type).toBe("array");
    expect(schema.properties.translations.items.type).toBe("string");
  });

  it("WhenThumbnailResponse_ThenMatchesOpenApiSchema", () => {
    const schema = loadOpenApi().components.schemas.ThumbnailResponse;
    expect(schema.required).toEqual(expect.arrayContaining(["thumbnail_path"]));
    expect(schema.properties.thumbnail_path.type).toBe("string");
  });

  it("WhenTokenAnalysis_ThenHasRequiredFields", () => {
    const schema = loadOpenApi().components.schemas.TokenAnalysis;
    expect(schema.required).toEqual(
      expect.arrayContaining(["text", "lemma", "pos", "is_stop"]),
    );
  });

  it("WhenSegment_ThenHasRequiredFields", () => {
    const schema = loadOpenApi().components.schemas.Segment;
    expect(schema.required).toEqual(
      expect.arrayContaining(["start", "end", "text"]),
    );
    expect(schema.properties.start.type).toBe("number");
    expect(schema.properties.end.type).toBe("number");
    expect(schema.properties.text.type).toBe("string");
  });
});
