<script lang="ts">
  import SubtitleDisplay from './SubtitleDisplay.svelte';
  import type { Subtitle } from './types';  const sampleSubtitle: Subtitle = {
    start: 0,
    end: 5,
    text: "El atraco fue increíble, estábamos listos.",
    translation: "The heist was incredible, we were ready.",
    words: [
      { text: "El", lemma: "el", translation: "the", difficulty: "easy" },
      { text: "atraco", lemma: "atraco", translation: "heist", difficulty: "hard" },
      { text: "fue", lemma: "fue", translation: "was", difficulty: "easy" },
      { 
        text: "increíble,", 
        lemma: "increíble", 
        translation: "incredible", 
        difficulty: "hard", 
        breakdown: "in- + creíble (not believable)" 
      },
      { 
        text: "estábamos", 
        lemma: "estábamos", 
        translation: "we were", 
        difficulty: "learning", 
        breakdown: "estar (imperfect, 1st person plural)" 
      },
      { text: "listos.", lemma: "listo", translation: "ready", difficulty: "learning" },
    ]
  };

  const basicSubtitle: Subtitle = {
    start: 0,
    end: 5,
    text: "Hello. I am a basic subtitle without words mapped.",
    translation: "Hola, soy un subtitulo."
  };
</script>

<Hst.Story title="Components/Player/SubtitleDisplay" layout={{ type: 'grid', width: 600 }}>
  {#snippet children()}
    <Hst.Variant title="Filtered Mode (Default)">
      <div class="relative w-full h-[400px] bg-zinc-800 rounded-lg overflow-hidden">
        <SubtitleDisplay subtitle={sampleSubtitle} mode="FILTERED" videoTargetLang="es" />
      </div>
    </Hst.Variant>

    <Hst.Variant title="Dual Mode">
      <div class="relative w-full h-[400px] bg-zinc-800 rounded-lg overflow-hidden">
        <SubtitleDisplay subtitle={sampleSubtitle} mode="DUAL" />
      </div>
    </Hst.Variant>

    <Hst.Variant title="Original Mode">
      <div class="relative w-full h-[400px] bg-zinc-800 rounded-lg overflow-hidden">
        <SubtitleDisplay subtitle={sampleSubtitle} mode="ORIGINAL" />
      </div>
    </Hst.Variant>

    <Hst.Variant title="Fallback (No words mapped)">
      <div class="relative w-full h-[400px] bg-zinc-800 rounded-lg overflow-hidden">
        <SubtitleDisplay subtitle={basicSubtitle} mode="FILTERED" />
      </div>
    </Hst.Variant>
  {/snippet}
</Hst.Story>
