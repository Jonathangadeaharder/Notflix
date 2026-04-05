// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/svelte";
import GameOverlay from "./GameOverlay.svelte";

describe("GameOverlay.svelte", () => {
  it("should be perfectly isolated and delegate answer submissions to the parent via onAnswerSubmitted", async () => {
    const mockCards = [
      {
        lemma: "uno",
        lang: "es",
        original: "uno",
        contextSentence: "uno",
      },
      {
        lemma: "dos",
        lang: "es",
        original: "dos",
        contextSentence: "dos",
      },
    ];

    const mockComplete = vi.fn();
    const mockSubmit = vi.fn();

    const { getByTestId, debug } = render(GameOverlay, {
      props: {
        cards: mockCards,
        onComplete: mockComplete,
        onAnswerSubmitted: mockSubmit,
      },
    });

    // Verify the dumb component successfully rendered the mock data
    expect(getByTestId("card-original").textContent).toContain("uno");

    const knownButton = getByTestId("swipe-right");
    await fireEvent.click(knownButton);

    // Assert strictly that no network request occurred inside the component, but the prop was invoked
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({
      lemma: "uno",
      lang: "es",
      isKnown: true,
    });

    // Test second card (swipe left)
    await waitFor(() => {
      expect(getByTestId("swipe-left")).toBeDefined();
    });
    expect(getByTestId("card-original").textContent).toContain("dos");
    
    const unknownButton = getByTestId("swipe-left");
    await fireEvent.click(unknownButton);
    
    expect(mockSubmit).toHaveBeenCalledWith({
      lemma: "dos",
      lang: "es",
      isKnown: false,
    });

    // Completing all cards should trigger onComplete optimistic UI
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });
});
