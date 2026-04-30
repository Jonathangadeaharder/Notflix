import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import SubtitleDisplay from './SubtitleDisplay.svelte';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const TEST_TIMEOUT_MS = 5000;

describe('SubtitleDisplay.svelte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSubtitle = {
    start: 0,
    end: 10,
    text: 'El murciélago vuela',
    translation: 'The bat flies',
    words: [
      {
        text: 'El',
        lemma: 'el',
        pos: 'ART',
        difficulty: 'easy',
        whitespace: ' ',
        translation: 'The',
        isKnown: true,
      },
      {
        text: 'murciélago',
        lemma: 'murciélago',
        pos: 'NOUN',
        difficulty: 'learning',
        whitespace: ' ',
        translation: 'bat',
        isKnown: false,
      },
      {
        text: 'vuela',
        lemma: 'volar',
        pos: 'VERB',
        difficulty: 'easy',
        whitespace: '',
        translation: 'flies',
        isKnown: false,
      },
    ],
  };

  it('renders words with Ambient token classes when mode is FILTERED', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    render(SubtitleDisplay, {
      props: {
        subtitle: mockSubtitle as never,
        mode: 'FILTERED',
      },
    });

    const words = screen.getAllByTestId('subtitle-word');
    expect(words).toHaveLength(3);
    // Easy / known words get tok-easy (Ambient: dimmed)
    expect(words[0].className).toContain('tok-easy');
    // Learning words get tok-learn-pulse (gold pulse)
    expect(words[1].className).toContain('tok-learn-pulse');
  });

  it('opens word details on click and triggers pause request', {
    timeout: TEST_TIMEOUT_MS,
  }, async () => {
    const onPauseRequest = vi.fn();
    render(SubtitleDisplay, {
      props: {
        subtitle: mockSubtitle as never,
        mode: 'FILTERED',
        onPauseRequest,
      },
    });

    const words = screen.getAllByTestId('subtitle-word');

    // Click pins the popup immediately (hover has a 180ms delay; click is
    // intentional and synchronous — that's the design).
    await fireEvent.click(words[1]);

    expect(onPauseRequest).toHaveBeenCalled();
    expect(screen.getByTestId('word-popup')).toBeVisible();
    expect(screen.getAllByText('murciélago').length).toBeGreaterThan(0);
    expect(screen.getByText('bat')).toBeVisible();
  });

  it('sends a request to mark word as known', {
    timeout: TEST_TIMEOUT_MS,
  }, async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const onMarkKnown = vi.fn();

    render(SubtitleDisplay, {
      props: {
        subtitle: mockSubtitle as never,
        mode: 'FILTERED',
        onMarkKnown,
      },
    });

    const words = screen.getAllByTestId('subtitle-word');
    await fireEvent.click(words[1]);
    expect(screen.getByTestId('word-popup')).toBeVisible();

    const markKnownButton = screen.getByRole('button', {
      name: /mark known/i,
    });
    await fireEvent.click(markKnownButton);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/words/known'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ lemma: 'murciélago', lang: 'Target' }),
      }),
    );

    await waitFor(() => {
      expect(onMarkKnown).toHaveBeenCalledWith('murciélago');
    });
  });

  it('does not render when mode is OFF', { timeout: TEST_TIMEOUT_MS }, () => {
    render(SubtitleDisplay, {
      props: {
        subtitle: mockSubtitle as never,
        mode: 'OFF',
      },
    });

    expect(screen.queryByTestId('subtitle-container')).toBeNull();
  });

  it('WhenModeOriginal_ThenHidesTranslation', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    render(SubtitleDisplay, {
      props: {
        subtitle: mockSubtitle as never,
        mode: 'ORIGINAL',
      },
    });

    expect(screen.getByTestId('subtitle-container')).toBeVisible();
    expect(screen.queryByText('The bat flies')).toBeNull();
  });

  it('WhenWordHasBreakdown_ThenShowsBreakdown', {
    timeout: TEST_TIMEOUT_MS,
  }, async () => {
    const subtitleWithBreakdown = {
      ...mockSubtitle,
      words: [
        {
          text: 'murciélago',
          lemma: 'murciélago',
          difficulty: 'learning',
          translation: 'bat',
          breakdown: 'NOUN • Unknown',
          isKnown: false,
        },
      ],
    };

    render(SubtitleDisplay, {
      props: {
        subtitle: subtitleWithBreakdown as never,
        mode: 'FILTERED',
      },
    });

    const words = screen.getAllByTestId('subtitle-word');
    await fireEvent.click(words[0]);

    expect(screen.getByText('NOUN • Unknown')).toBeVisible();
  });

  it('WhenFetchFails_ThenShowsError', {
    timeout: TEST_TIMEOUT_MS,
  }, async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(SubtitleDisplay, {
      props: {
        subtitle: mockSubtitle as never,
        mode: 'FILTERED',
      },
    });

    const words = screen.getAllByTestId('subtitle-word');
    await fireEvent.click(words[1]);

    const markKnownButton = screen.getByRole('button', {
      name: /mark known/i,
    });
    await fireEvent.click(markKnownButton);

    await waitFor(() => {
      expect(
        screen.getByText('Could not save this word right now.'),
      ).toBeVisible();
    });
  });

  it('WhenWordIsKnown_ThenButtonShowsKnown', {
    timeout: TEST_TIMEOUT_MS,
  }, async () => {
    const knownSubtitle = {
      ...mockSubtitle,
      words: [
        {
          text: 'El',
          lemma: 'el',
          difficulty: 'easy',
          translation: 'The',
          isKnown: true,
        },
      ],
    };

    render(SubtitleDisplay, {
      props: {
        subtitle: knownSubtitle as never,
        mode: 'FILTERED',
      },
    });

    const words = screen.getAllByTestId('subtitle-word');
    await fireEvent.click(words[0]);

    // Disabled button labelled with "Known" (the design uses ✓ Known)
    const knownButton = await screen.findByRole('button', {
      name: /known/i,
    });
    expect(knownButton).toBeVisible();
    expect(knownButton).toBeDisabled();
  });

  it('WhenNoWords_ThenFallsBackToText', { timeout: TEST_TIMEOUT_MS }, () => {
    const textOnlySubtitle = {
      start: 0,
      end: 5,
      text: 'Hola mundo',
      translation: 'Hello world',
    };

    render(SubtitleDisplay, {
      props: {
        subtitle: textOnlySubtitle as never,
        mode: 'FILTERED',
      },
    });

    expect(screen.getByText('Hola mundo')).toBeVisible();
  });
});
