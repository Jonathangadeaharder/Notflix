<script lang="ts">
    import VideoPlayer from "$lib/components/player/VideoPlayer.svelte";
    import type { Subtitle } from "$lib/components/player/types";

    const video = {
        id: "mock-video-id",
        title: "Mock Video",
        filePath:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // Reliable public test video
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

    let gameCards: any[] = [];

    function handleRequestGameCards(
        chunkIndex: number,
        start: number,
        end: number,
    ) {
        console.log("Mock Request Game Cards", chunkIndex);
        setTimeout(() => {
            gameCards = [{ type: "card", front: "Test", back: "Prueba" }];
        }, 100);
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
