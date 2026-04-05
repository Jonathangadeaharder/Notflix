// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/svelte";
import VideoPlayer from "./VideoPlayer.svelte";

describe("VideoPlayer.svelte", () => {
  it("should act as a dumb wrapper that mounts correctly without initiating unauthorized side-effects", () => {
    const mockVideo = {
      id: "v_123",
      filePath: "/mock-video.mp4",
      thumbnailPath: "/mock-thumb.jpg",
      targetLang: "es",
      title: "Mock Video",
      status: "READY" as any,
      progress: 0,
      views: 0,
      uploadDate: new Date(),
      processingProgress: 100,
      error: null,
      duration: 100,
      videoProgress: 0,
    };

    const mockSubtitles: any[] = [];
    const mockSettings = {
      subtitleLanguage: "es",
      gameInterval: 5,
      difficulty: "B1" as any,
    };

    const { getByTestId, container } = render(VideoPlayer, {
      props: {
        video: mockVideo,
        subtitles: mockSubtitles,
        settings: mockSettings,
        gameCards: [],
      },
    });

    // Test purely structural integrity of the player framework
    const videoElement = getByTestId("video-player") as HTMLVideoElement;
    expect(videoElement).toBeDefined();
    // Since we didn't pass props triggering immediately, game overlay shouldn't exist
    const overlay = container.querySelector('[data-testid="game-overlay"]');
    expect(overlay).toBeNull();
  });

  it("should correctly expose the GameOverlay when gameCards props are injected by parent state", async () => {
    const mockVideo = { id: "v_123" } as any;
    const mockSubtitles: any[] = [];
    const mockSettings = {} as any;

    const { getByTestId } = render(VideoPlayer, {
      props: {
        video: mockVideo,
        subtitles: mockSubtitles,
        settings: mockSettings,
        gameCards: [
          {
            lemma: "test",
            lang: "es",
            original: "test",
            contextSentence: "test",
          },
        ],
      },
    });

    // The dumb component reacts structurally to the prop injection from its parent.
    expect(getByTestId("game-overlay")).toBeDefined();
  });
});
