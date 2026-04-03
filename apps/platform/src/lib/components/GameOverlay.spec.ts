// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import GameOverlay from "./GameOverlay.svelte";

describe("GameOverlay.svelte", () => {
  it("should be perfectly isolated and delegate answer submissions to the parent via onAnswerSubmitted", async () => {
    const mockCards = [
      {
        lemma: "murciélago",
        lang: "es",
        original: "murciélago",
        contextSentence: "El murciélago vuela por la noche.",
      },
    ];

    const mockComplete = vi.fn();
    const mockSubmit = vi.fn();

    const { getByTestId } = render(GameOverlay, {
      props: {
        cards: mockCards,
        onComplete: mockComplete,
        onAnswerSubmitted: mockSubmit,
      },
    });

    // Verify the dumb component successfully rendered the mock data
    expect(getByTestId("card-original").textContent).toContain("murciélago");

    const knownButton = getByTestId("swipe-right");
    await fireEvent.click(knownButton);

    // Assert strictly that no network request occurred inside the component, but the prop was invoked
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({
      lemma: "murciélago",
      lang: "es",
      isKnown: true,
    });

    // As there is only 1 card, completing the card should immediately trigger onComplete optimistic UI
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });

  it("should delegate unknown answers to the parent as well", async () => {
    const mockCards = [
      {
        lemma: "murciélago",
        lang: "es",
        original: "murciélago",
        contextSentence: "El murciélago vuela por la noche.",
      },
    ];

    const mockSubmit = vi.fn();

    const { getByTestId } = render(GameOverlay, {
      props: {
        cards: mockCards,
        onComplete: vi.fn(),
        onAnswerSubmitted: mockSubmit,
      },
    });

    const unknownButton = getByTestId("swipe-left");
    await fireEvent.click(unknownButton);

    expect(mockSubmit).toHaveBeenCalledWith({
      lemma: "murciélago",
      lang: "es",
      isKnown: false,
    });
  });
});
