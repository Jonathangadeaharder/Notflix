import {
  globalEvents,
  EVENTS,
  type VideoUploadedPayload,
  type TranscriptionCompletedPayload,
  type AnalysisCompletedPayload,
} from "../infrastructure/event-bus";
import {
  mapAnalysisToSegments,
  extractUniqueLemmas,
  extractUnknownLemmas,
  mapTranslationsToSegments,
} from "../domain/translation-core";
import type { IAiGateway } from "../domain/interfaces";
import { db as drizzleDb } from "../infrastructure/database";
import type { SmartFilter } from "./linguistic-filter.service";
import { video, videoProcessing } from "@notflix/database";
import { eq } from "drizzle-orm";
import { ProcessingStatus, toAiServicePath } from "../infrastructure/config";

// The pipeline sets up event listeners to chain the heavy workload completely decoupled.
export function registerPipelineListeners(
  db: typeof drizzleDb,
  aiGateway: IAiGateway,
  filter: SmartFilter,
) {
  // 1. UPLOAD -> TRANSCRIBE
  globalEvents.on(
    EVENTS.VIDEO_UPLOADED,
    async (payload: VideoUploadedPayload) => {
      console.log(
        `[Pipeline] Video Uploaded: ${payload.videoId}. Initiating pipeline.`,
      );

      try {
        await db
          .insert(videoProcessing)
          .values({
            videoId: payload.videoId,
            targetLang: payload.targetLang,
            status: ProcessingStatus.PENDING,
            vttJson: null,
          })
          .onConflictDoUpdate({
            target: [videoProcessing.videoId, videoProcessing.targetLang],
            set: { status: ProcessingStatus.PENDING, vttJson: null },
          });

        globalEvents.emit(EVENTS.PROCESSING_UPDATE, {
          videoId: payload.videoId,
          status: "TRANSCRIBING",
          percent: 10,
        });

        const [record] = await db
          .select()
          .from(video)
          .where(eq(video.id, payload.videoId))
          .limit(1);
        if (!record) throw new Error("Video not found");

        const aiPath = toAiServicePath(record.filePath);
        const transcription = await aiGateway.transcribe(
          aiPath,
          payload.targetLang,
        );

        globalEvents.emit(EVENTS.TRANSCRIPTION_COMPLETED, {
          ...payload,
          transcription,
        } satisfies TranscriptionCompletedPayload);

        // Spawn thumbnail in background, completely detached
        if (!record.filePath.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
          aiGateway
            .generateThumbnail(aiPath)
            .then(async (res) => {
              await db
                .update(video)
                .set({ thumbnailPath: res.thumbnail_path })
                .where(eq(video.id, payload.videoId));
            })
            .catch((e) => console.warn("Thumbnail failed", e));
        }
      } catch (err) {
        console.error(`[Pipeline Error] TRANSCRIBE:`, err);
        await db
          .update(videoProcessing)
          .set({ status: ProcessingStatus.ERROR })
          .where(eq(videoProcessing.videoId, payload.videoId));
      }
    },
  );

  // 2. TRANSCRIBE -> ANALYZE
  globalEvents.on(
    EVENTS.TRANSCRIPTION_COMPLETED,
    async (payload: TranscriptionCompletedPayload) => {
      console.log(
        `[Pipeline] Transcription complete for: ${payload.videoId}. Starting Analysis.`,
      );
      try {
        globalEvents.emit(EVENTS.PROCESSING_UPDATE, {
          videoId: payload.videoId,
          status: "ANALYZING",
          percent: 50,
        });

        const segmentTexts = payload.transcription.segments.map(
          (s: any) => s.text,
        );
        const batchAnalysis = await aiGateway.analyzeBatch(
          segmentTexts,
          payload.targetLang,
        );
        const mappedSegments = mapAnalysisToSegments(
          payload.transcription,
          batchAnalysis.results,
        );

        globalEvents.emit(EVENTS.ANALYSIS_COMPLETED, {
          videoId: payload.videoId,
          targetLang: payload.targetLang,
          nativeLang: payload.nativeLang,
          userId: payload.userId,
          segments: mappedSegments,
        } satisfies AnalysisCompletedPayload);
      } catch (err) {
        console.error(`[Pipeline Error] ANALYZE:`, err);
        await db
          .update(videoProcessing)
          .set({ status: ProcessingStatus.ERROR })
          .where(eq(videoProcessing.videoId, payload.videoId));
      }
    },
  );

  // 3. ANALYZE -> ENRICH (TRANSLATE) -> COMPLETE
  globalEvents.on(
    EVENTS.ANALYSIS_COMPLETED,
    async (payload: AnalysisCompletedPayload) => {
      console.log(
        `[Pipeline] Analysis complete for: ${payload.videoId}. Starting Translation Enrichment.`,
      );
      try {
        globalEvents.emit(EVENTS.PROCESSING_UPDATE, {
          videoId: payload.videoId,
          status: "TRANSLATING",
          percent: 80,
        });

        let finalSegments = payload.segments;
        const sentenceTexts = finalSegments.map((s: any) => s.text);

        if (!payload.userId) {
          // Guest mode
          const lemmaList = extractUniqueLemmas(finalSegments, 50); // limit 50
          const [lemmaRes, sentenceRes] = await Promise.all([
            lemmaList.length > 0
              ? aiGateway.translate(
                  lemmaList,
                  payload.targetLang,
                  payload.nativeLang,
                )
              : { translations: [] },
            aiGateway.translate(
              sentenceTexts,
              payload.targetLang,
              payload.nativeLang,
            ),
          ]);
          finalSegments = mapTranslationsToSegments(
            finalSegments,
            lemmaList,
            lemmaRes.translations,
            sentenceRes.translations,
          );
        } else {
          // User mode with Linguistic Filter
          const segmentsTokens = finalSegments.map((s: any) => s.tokens);
          const filteredSegments = await filter.filterBatch(
            segmentsTokens,
            payload.userId,
            payload.targetLang,
          );

          finalSegments.forEach((seg, i) => {
            seg.classification = filteredSegments[i].classification;
            seg.tokens = filteredSegments[i].tokens;
          });

          const lemmaList = extractUnknownLemmas(finalSegments);
          const [lemmaRes, sentenceRes] = await Promise.all([
            lemmaList.length > 0
              ? aiGateway.translate(
                  lemmaList,
                  payload.targetLang,
                  payload.nativeLang,
                )
              : { translations: [] },
            aiGateway.translate(
              sentenceTexts,
              payload.targetLang,
              payload.nativeLang,
            ),
          ]);

          finalSegments = mapTranslationsToSegments(
            finalSegments,
            lemmaList,
            lemmaRes.translations,
            sentenceRes.translations,
          );
        }

        // Save COMPLETED
        await db
          .update(videoProcessing)
          .set({ status: ProcessingStatus.COMPLETED, vttJson: finalSegments })
          .where(eq(videoProcessing.videoId, payload.videoId));

        globalEvents.emit(EVENTS.PROCESSING_UPDATE, {
          videoId: payload.videoId,
          status: ProcessingStatus.COMPLETED,
          percent: 100,
        });
        console.log(
          `[Pipeline] Processing fully complete for: ${payload.videoId}.`,
        );
      } catch (err) {
        console.error(`[Pipeline Error] ENRICH:`, err);
        await db
          .update(videoProcessing)
          .set({ status: ProcessingStatus.ERROR })
          .where(eq(videoProcessing.videoId, payload.videoId));
      }
    },
  );
}
