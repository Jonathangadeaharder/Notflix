// @vitest-environment jsdom

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import GameOverlay from './GameOverlay.svelte';

describe('GameOverlay.svelte', () => {
  it('delegates answer submissions to the parent and resumes after the final card', async () => {
    const mockCards = [
      {
        lemma: 'uno',
        lang: 'es',
        original: 'uno',
        contextSentence: 'uno',
      },
      {
        lemma: 'dos',
        lang: 'es',
        original: 'dos',
        contextSentence: 'dos',
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

    // First card renders with the original word
    expect(getByTestId('card-original').textContent).toContain('uno');

    // The redesigned overlay uses Again/Hard/Good/Easy SRS rating buttons,
    // but exposes hidden swipe-left/swipe-right test affordances for parity.
    const knownButton = getByTestId('swipe-right');
    await fireEvent.click(knownButton);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({
      lemma: 'uno',
      lang: 'es',
      isKnown: true,
    });

    // Second card now active
    await waitFor(() => {
      expect(getByTestId('card-original').textContent).toContain('dos');
    });

    const unknownButton = getByTestId('swipe-left');
    await fireEvent.click(unknownButton);

    expect(mockSubmit).toHaveBeenCalledWith({
      lemma: 'dos',
      lang: 'es',
      isKnown: false,
    });

    // After the final card, the overlay shows a brief "Resuming..." moment
    // (dramatic by design — the world fades back in) before onComplete fires.
    await waitFor(
      () => {
        expect(mockComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: 2500 },
    );
  });
});
