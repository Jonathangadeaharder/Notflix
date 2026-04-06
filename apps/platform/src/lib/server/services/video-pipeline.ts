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
import { eq, and } from "drizzle-orm";
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
            progressStage: "QUEUED",
            progressPercent: 0,
            vttJson: null,
          })
          .onConflictDoUpdate({
            target: [videoProcessing.videoId, videoProcessing.targetLang],
            set: {
              status: ProcessingStatus.PENDING,
              progressStage: "QUEUED",
              progressPercent: 0,
              vttJson: null,
            },
          });

        globalEvents.emit(EVENTS.PROCESSING_UPDATE, {
          videoId: payload.videoId,
          status: "TRANSCRIBING",
          percent: 10,
        });
        await db
          .update(videoProcessing)
          .set({ progressStage: "TRANSCRIBING", progressPercent: 5 })
          .where(eq(videoProcessing.videoId, payload.videoId));

        const [record] = await db
          .select()
          .from(video)
          .where(eq(video.id, payload.videoId))
          .limit(1);
        if (!record) throw new Error("Video not found");

        const aiPath = toAiServicePath(record.filePath);
        const PROGRESS_DB_PERCENT_STEP = 5;
        const PROGRESS_DB_MIN_INTERVAL_MS = 1000;
        let lastPersistedPercent = 5;
        let lastPersistedAt = Date.now();

        const transcription = await aiGateway.transcribeWithProgress(
          aiPath,
          payload.targetLang,
          async (percent) => {
            const normalizedPercent = Math.max(
              lastPersistedPercent,
              Math.min(100, Math.round(percent)),
            );
            const now = Date.now();
            const percentAdvanced =
              normalizedPercent - lastPersistedPercent >=
              PROGRESS_DB_PERCENT_STEP;
            const intervalElapsed =
              now - lastPersistedAt >= PROGRESS_DB_MIN_INTERVAL_MS;
            const shouldPersist =
              normalizedPercent === 100 || percentAdvanced || intervalElapsed;

            if (!shouldPersist) {
              return;
            }

            lastPersistedPercent = normalizedPercent;
            lastPersistedAt = now;

            await db
              .update(videoProcessing)
              .set({
                progressStage: "TRANSCRIBING",
                progressPercent: normalizedPercent,
              })
              .where(
                and(
                  eq(videoProcessing.videoId, payload.videoId),
                  eq(videoProcessing.targetLang, payload.targetLang),
                ),
              );
          },
        );

        await db
          .update(videoProcessing)
          .set({ progressStage: "TRANSCRIBING", progressPercent: 100 })
          .where(
            and(
              eq(videoProcessing.videoId, payload.videoId),
              eq(videoProcessing.targetLang, payload.targetLang),
            ),
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
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error(
          `[Pipeline Error] TRANSCRIBE videoId=${payload.videoId}: ${message}`,
          stack ?? "",
        );
        await db
          .update(videoProcessing)
          .set({ status: ProcessingStatus.ERROR, progressStage: "FAILED" })
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
        await db
          .update(videoProcessing)
          .set({ progressStage: "ANALYZING", progressPercent: 50 })
          .where(eq(videoProcessing.videoId, payload.videoId));

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
        await db
          .update(videoProcessing)
          .set({ progressStage: "TRANSLATING", progressPercent: 80 })
          .where(eq(videoProcessing.videoId, payload.videoId));

        let finalSegments = payload.segments;
        const sentenceTexts = finalSegments.map((s: any) => s.text);

        async function translateAndMapSegments(
          segmentsToMap: any[],
          lemmasToTranslate: string[],
        ) {
          const [lemmaRes, sentenceRes] = await Promise.all([
            lemmasToTranslate.length > 0
              ? aiGateway.translate(
                  lemmasToTranslate,
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

          return mapTranslationsToSegments(
            segmentsToMap,
            lemmasToTranslate,
            lemmaRes.translations,
            sentenceRes.translations,
          );
        }

        if (!payload.userId) {
          // Guest mode
          const lemmaList = extractUniqueLemmas(finalSegments, 50); // limit 50
          finalSegments = await translateAndMapSegments(
            finalSegments,
            lemmaList,
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
          finalSegments = await translateAndMapSegments(
            finalSegments,
            lemmaList,
          );
        }

        // Save COMPLETED
        await db
          .update(videoProcessing)
          .set({
            status: ProcessingStatus.COMPLETED,
            progressStage: "READY",
            progressPercent: 100,
            vttJson: finalSegments,
          })
          .where(
            and(
              eq(videoProcessing.videoId, payload.videoId),
              eq(videoProcessing.targetLang, payload.targetLang),
            ),
          );

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
          .where(
            and(
              eq(videoProcessing.videoId, payload.videoId),
              eq(videoProcessing.targetLang, payload.targetLang),
            ),
          );
      }
    },
  );
}
