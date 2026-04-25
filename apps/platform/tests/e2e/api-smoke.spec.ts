import { test, expect } from "@playwright/test";

test.describe("API Smoke Tests", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });

  test("DELETE /api/videos/:id with invalid UUID returns 400", async ({
    request,
  }) => {
    const response = await request.delete("/api/videos/not-a-uuid");
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("POST /api/words/known with invalid body returns 400", async ({
    request,
  }) => {
    const response = await request.post("/api/words/known", {
      data: { lemma: "", lang: "toolong-lang-code" },
    });
    expect(response.status()).toBe(400);
  });

  test("GET /api/game/generate with invalid videoId returns 400", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/game/generate?videoId=not-a-uuid&start=0&end=60&targetLang=es",
    );
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
