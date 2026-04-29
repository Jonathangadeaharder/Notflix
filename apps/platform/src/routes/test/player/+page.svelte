<script lang="ts">
  import { base } from "$app/paths";
  import type { Subtitle } from "$lib/components/player/types";
  import VideoPlayer from "$lib/components/player/VideoPlayer.svelte";
  import type { GameCard } from "$lib/types";

  const video = {
    id: "mock-video-id",
    title: "Mock Video",
    filePath: `${base}/test-video.webm`,
    targetLang: "es",
    duration: 600,
    thumbnailPath: "",
  };

  const subtitles: Subtitle[] = [
    {
      start: 1,
      end: 5,
      text: "Hola mundo",
      translation: "Hello world",
      words: [
        {
          text: "Hola",
          difficulty: "easy",
          lemma: "hola",
          translation: "hello",
        },
        {
          text: "mundo",
          difficulty: "easy",
          lemma: "mundo",
          translation: "world",
        },
      ],
    },
    {
      start: 5.1,
      end: 10,
      text: "Esta es una prueba",
      translation: "This is a test",
      words: [
        { text: "Esta", difficulty: "easy" },
        { text: "es", difficulty: "easy" },
        { text: "una", difficulty: "easy" },
        {
          text: "prueba",
          difficulty: "hard",
          lemma: "prueba",
          translation: "test",
        },
      ],
    },
  ];

  const settings = {
    gameInterval: 10, // Minutes
  };

  const MOCK_GAME_CARD_DELAY_MS = 100;
  let gameCards: GameCard[] = [];

  // prettier-ignore
  function handleRequestGameCards(chunkIndex: number, _start: number, _end: number) {
    console.log("Mock Request Game Cards", chunkIndex);
    setTimeout(() => {
      gameCards = [{
        lemma: "prueba",
        lang: "es",
        original: "prueba",
        contextSentence: "Esta es una prueba",
        cefr: "A2",
        translation: "test",
        isKnown: false,
      }];
    }, MOCK_GAME_CARD_DELAY_MS);
  }
</script>

<div class="w-full h-screen bg-black">
  <VideoPlayer
    {video}
    {subtitles}
    {settings}
    {gameCards}
    onRequestGameCards={handleRequestGameCards}
  />
</div>
