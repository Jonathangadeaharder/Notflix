import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import SubtitleDisplay from "./SubtitleDisplay.svelte";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const TEST_TIMEOUT_MS = 5000;

describe("SubtitleDisplay.svelte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSubtitle = {
    start: 0,
    end: 10,
    text: "El murciélago vuela",
    translation: "The bat flies",
    words: [
      {
        text: "El",
        lemma: "el",
        pos: "ART",
        difficulty: "easy",
        whitespace: " ",
        translation: "The",
        isKnown: true,
      },
      {
        text: "murciélago",
        lemma: "murciélago",
        pos: "NOUN",
        difficulty: "learning",
        whitespace: " ",
        translation: "bat",
        isKnown: false,
      },
      {
        text: "vuela",
        lemma: "volar",
        pos: "VERB",
        difficulty: "easy",
        whitespace: "",
        translation: "flies",
        isKnown: false,
      },
    ],
  };

  it(
    "renders words when mode is FILTERED",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      render(SubtitleDisplay, {
        props: {
          subtitle: mockSubtitle as any,
          mode: "FILTERED",
        },
      });

      const words = screen.getAllByTestId("subtitle-word");
      expect(words).toHaveLength(3);
      // The learning word gets amber styling
      expect(words[1].className).toContain("text-amber-400");
    },
  );

  it(
    "opens word details on hover and triggers pause request",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const onPauseRequest = vi.fn();
      render(SubtitleDisplay, {
        props: {
          subtitle: mockSubtitle as any,
          mode: "FILTERED",
          onPauseRequest,
        },
      });

      const words = screen.getAllByTestId("subtitle-word");

      // Hover the second word
      await fireEvent.mouseEnter(words[1]);

      expect(onPauseRequest).toHaveBeenCalled();
      expect(screen.getByTestId("word-popup")).toBeVisible();
      expect(screen.getAllByText("murciélago").length).toBeGreaterThan(0); // Lemma
      expect(screen.getByText("bat")).toBeVisible(); // Translation
    },
  );

  it(
    "sends a request to mark word as known",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const onMarkKnown = vi.fn();

      render(SubtitleDisplay, {
        props: {
          subtitle: mockSubtitle as any,
          mode: "FILTERED",
          onMarkKnown,
        },
      });

      const words = screen.getAllByTestId("subtitle-word");

      // Click the word to pin and open
      await fireEvent.click(words[1]);
      expect(screen.getByTestId("word-popup")).toBeVisible();

      const markKnownButton = screen.getByRole("button", {
        name: "Mark Known",
      });
      await fireEvent.click(markKnownButton);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/words/known"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ lemma: "murciélago", lang: "Target" }),
        }),
      );

      await waitFor(() => {
        expect(onMarkKnown).toHaveBeenCalledWith("murciélago");
      });
    },
  );

  it("does not render when mode is OFF", { timeout: TEST_TIMEOUT_MS }, () => {
    render(SubtitleDisplay, {
      props: {
        subtitle: mockSubtitle as any,
        mode: "OFF",
      },
    });

    expect(screen.queryByTestId("subtitle-container")).toBeNull();
  });

  it(
    "WhenModeOriginal_ThenHidesTranslation",
    { timeout: TEST_TIMEOUT_MS },
    () => {
      render(SubtitleDisplay, {
        props: {
          subtitle: mockSubtitle as any,
          mode: "ORIGINAL",
        },
      });

      expect(screen.getByTestId("subtitle-container")).toBeVisible();
      // ORIGINAL mode: no translation separator bar
      expect(screen.queryByText("The bat flies")).toBeNull();
    },
  );

  it(
    "WhenWordHasBreakdown_ThenShowsBreakdown",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const subtitleWithBreakdown = {
        ...mockSubtitle,
        words: [
          {
            text: "murciélago",
            lemma: "murciélago",
            difficulty: "learning",
            translation: "bat",
            breakdown: "NOUN • Unknown",
            isKnown: false,
          },
        ],
      };

      render(SubtitleDisplay, {
        props: {
          subtitle: subtitleWithBreakdown as any,
          mode: "FILTERED",
        },
      });

      const words = screen.getAllByTestId("subtitle-word");
      await fireEvent.mouseEnter(words[0]);

      expect(screen.getByText("NOUN • Unknown")).toBeVisible();
    },
  );

  it(
    "WhenFetchFails_ThenShowsError",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(SubtitleDisplay, {
        props: {
          subtitle: mockSubtitle as any,
          mode: "FILTERED",
        },
      });

      const words = screen.getAllByTestId("subtitle-word");
      await fireEvent.click(words[1]);

      const markKnownButton = screen.getByRole("button", {
        name: "Mark Known",
      });
      await fireEvent.click(markKnownButton);

      await waitFor(() => {
        expect(
          screen.getByText("Could not save this word right now."),
        ).toBeVisible();
      });
    },
  );

  it(
    "WhenWordIsKnown_ThenButtonShowsKnown",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
      const knownSubtitle = {
        ...mockSubtitle,
        words: [
          {
            text: "El",
            lemma: "el",
            difficulty: "easy",
            translation: "The",
            isKnown: true,
          },
        ],
      };

      render(SubtitleDisplay, {
        props: {
          subtitle: knownSubtitle as any,
          mode: "FILTERED",
        },
      });

      const words = screen.getAllByTestId("subtitle-word");
      await fireEvent.mouseEnter(words[0]);

      expect(screen.getByRole("button", { name: "Known" })).toBeVisible();
    },
  );

  it("WhenNoWords_ThenFallsBackToText", { timeout: TEST_TIMEOUT_MS }, () => {
    const textOnlySubtitle = {
      start: 0,
      end: 5,
      text: "Hola mundo",
      translation: "Hello world",
    };

    render(SubtitleDisplay, {
      props: {
        subtitle: textOnlySubtitle as any,
        mode: "FILTERED",
      },
    });

    expect(screen.getByText("Hola mundo")).toBeVisible();
  });
});
