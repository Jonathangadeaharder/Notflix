import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import SubtitleDisplay from "./SubtitleDisplay.svelte";

const mockFetch = vi.fn();
global.fetch = mockFetch;

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

  it("renders words when mode is FILTERED", () => {
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
  });

  it("opens word details on hover and triggers pause request", async () => {
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
  });

  it("sends a request to mark word as known", async () => {
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
    
    const markKnownButton = screen.getByRole("button", { name: "Mark Known" });
    await fireEvent.click(markKnownButton);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/words/known"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ lemma: "murciélago", lang: "Target" }),
      })
    );

    await waitFor(() => {
      expect(onMarkKnown).toHaveBeenCalledWith("murciélago");
    });
  });

  it("does not render when mode is OFF", () => {
    render(SubtitleDisplay, {
      props: {
        subtitle: mockSubtitle as any,
        mode: "OFF",
      },
    });

    expect(screen.queryByTestId("subtitle-container")).toBeNull();
  });
});
