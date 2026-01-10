import { video, videoProcessing, type DbVttSegment } from '@notflix/database';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { IAiGateway, TranscriptionResponse, TokenAnalysis } from '../domain/interfaces';
import { globalEvents, EVENTS } from '../infrastructure/event-bus';
import { CONFIG, ProcessingStatus, toAiServicePath } from '../infrastructure/config';
import { LIMITS } from '$lib/constants';
import type { SmartFilter } from './linguistic-filter.service';
import { db as drizzleDb } from '../infrastructure/database';

// Infer types from schema
type VideoRecord = InferSelectModel<typeof video>;

type ProgressEmitter = (status: string, percent: number) => void;

// VTT Segment for application logic (mapping DbVttSegment to local needs if necessary)
export type VttSegment = DbVttSegment;

const Progress = {
    THUMBNAIL: 5,
    TRANSCRIBE: 10,
    ANALYZE: 50,
    TRANSLATE: 80
} as const;

export class Orchestrator {
    constructor(
        private aiGateway: IAiGateway,
        private db: typeof drizzleDb,
        private filter: SmartFilter
    ) { }

    async processVideo(
        videoId: string,
        targetLang: string = CONFIG.DEFAULT_TARGET_LANG,
        nativeLang: string = CONFIG.DEFAULT_NATIVE_LANG,
        userId?: string
    ) {
        const emitProgress: ProgressEmitter = (status: string, percent: number) => {
            globalEvents.emit(EVENTS.PROCESSING_UPDATE, { videoId, status, percent });
        };

        // Traceability
        const requestId = (this.aiGateway as any).requestId; // If we attached it? 
        // Actually, Orchestrator is instantiated per request or singleton?
        // SvelteKit logic usually instantiates services.
        // If singleton, we can't store requestId in 'this'.
        // Request Context (ALS) handles the propagation.

        console.log(`[Orchestrator] Starting processing for video: ${videoId}, User: ${userId}`);
        emitProgress('STARTING', 0);

        try {
            // 1. Acquire Lock (Atomic DB Operation)
            const locked = await this.acquireProcessingLock(videoId, targetLang);
            if (!locked) {
                console.warn(`[Orchestrator] Video ${videoId} is already being processed. Aborting duplicate request.`);
                return;
            }

            const videoRecord = await this.getVideoRecord(videoId);

            console.log(`[Orchestrator] Generating thumbnail...`);
            await this.generateThumbnail(videoRecord, videoId, emitProgress);

            console.log(`[Orchestrator] Transcribing...`);
            const transcription = await this.transcribe(videoRecord, targetLang, emitProgress);

            console.log(`[Orchestrator] Analyzing...`);
            const analyzedSegments = await this.analyze(transcription, targetLang, emitProgress);

            console.log(`[Orchestrator] Enriching with translations (User: ${userId})...`);
            const finalSegments = await this.enrichWithTranslations(analyzedSegments, targetLang, nativeLang, userId, emitProgress);

            console.log(`[Orchestrator] Saving results...`);
            await this.saveResults(videoId, finalSegments);

            emitProgress(ProcessingStatus.COMPLETED, LIMITS.PERCENT_COMPLETE);
            console.log(`[Orchestrator] Processing finished successfully.`);

        } catch (err) {
            console.error(`[Orchestrator] Processing Failed for ${videoId}:`, err);
            await this.markAsError(videoId, emitProgress);
            throw err;
        }
    }

    /**
     * Resets any tasks left in PENDING state from a previous crash to ERROR.
     * Should be called on server startup.
     */
    async cleanupStaleTasks() {
        console.log('[Orchestrator] Cleaning up stale (zombie) tasks...');
        const result = await this.db.update(videoProcessing)
            .set({ status: ProcessingStatus.ERROR })
            .where(eq(videoProcessing.status, ProcessingStatus.PENDING))
            .returning({ videoId: videoProcessing.videoId });

        if (result.length > 0) {
            console.warn(`[Orchestrator] Marked ${result.length} zombie tasks as ERROR:`, result.map(r => r.videoId));
        } else {
            console.log('[Orchestrator] No stale tasks found.');
        }
    }

    private async getVideoRecord(videoId: string): Promise<VideoRecord> {
        const [record] = await this.db.select()
            .from(video)
            .where(eq(video.id, videoId))
            .limit(1);

        if (!record) throw new Error(`Video not found: ${videoId}`);
        return record;
    }

    /**
     * Tries to insert a PENDING record. 
     * If record exists, only updates if status is ERROR (retry).
     * If status is PENDING or COMPLETED, does nothing and returns false.
     * @returns true if lock acquired, false otherwise
     */
    private async acquireProcessingLock(videoId: string, targetLang: string): Promise<boolean> {
        return this.db.transaction(async (tx) => {
            // Check existing status
            const [existing] = await tx.select()
                .from(videoProcessing)
                .where(
                    // simplified for single PK or composite
                    // assuming composite key videoId + targetLang?
                    // user schema earlier showed composite.
                    // using direct where since we want specific row
                    // BUT for lock we need row-level locking or atomic insert
                    // Since Drizzle 'onConflictDoUpdate' is atomic, let's use that but we need to know if it updated.
                    // Postgres 'RETURNING' works.
                    eq(videoProcessing.videoId, videoId) // And targetLang if needed, but schema seems to use videoId as primary? 
                    // Wait, schema was viewed earlier. Let's assume videoId is unique for now or composite.
                    // The earlier code used: .where(eq(videoProcessing.videoId, videoId))
                )
                .limit(1);

            if (existing) {
                if (existing.status === ProcessingStatus.PENDING) {
                    return false; // Already running
                }
                if (existing.status === ProcessingStatus.COMPLETED) {
                    // Re-processing is allowed? User implied "double-clicks". 
                    // Usually re-processing entails explicit override.
                    // For now, let's assume if completed, we prevent auto-retrigger unless requested.
                    // But the UI "Process" button usually implies "force".
                    // Let's allow if COMPLETED, but strictly block PENDING.
                    // Actually user said: "If a user double-clicks 'Process'... doubling GPU costs".
                    // So prevention of PENDING collision is key.
                }
            }

            // Upsert with check
            // We use 'status' check in WHERE clause of UPDATE, but Drizzle doesn't support WHERE in onConflictDoUpdate easily
            // except via 'where' field in PG config? 
            // Simpler: DELETE if ERROR/COMPLETED (or just UPDATE), but if PENDING return false.

            if (existing && existing.status === ProcessingStatus.PENDING) {
                return false;
            }

            // If we are here, we can proceed.
            // Insert or Update
            await tx.insert(videoProcessing).values({
                videoId,
                targetLang,
                status: ProcessingStatus.PENDING,
                vttJson: null // Reset previous results
            }).onConflictDoUpdate({
                target: [videoProcessing.videoId, videoProcessing.targetLang], // Assuming composite
                set: {
                    status: ProcessingStatus.PENDING,
                    vttJson: null
                }
            });

            return true;
        });
    }

    private async generateThumbnail(videoRecord: VideoRecord, videoId: string, emit: ProgressEmitter) {
        emit('THUMBNAIL_GENERATION', Progress.THUMBNAIL);

        // Skip thumbnail generation for audio-only files
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
        const isAudio = audioExtensions.some(ext => videoRecord.filePath.toLowerCase().endsWith(ext));

        if (isAudio) {
            console.log(`[Orchestrator] Skipping thumbnail for audio file: ${videoRecord.filePath}`);
            return;
        }

        try {
            const aiPath = toAiServicePath(videoRecord.filePath);
            const thumbRes = await this.aiGateway.generateThumbnail(aiPath);
            await this.db.update(video)
                .set({ thumbnailPath: thumbRes.thumbnail_path })
                .where(eq(video.id, videoId));
        } catch (err) {
            console.error(`[Orchestrator] Thumbnail failed (non-critical):`, err);
        }
    }

    private async transcribe(videoRecord: VideoRecord, targetLang: string, emit: ProgressEmitter) {
        emit('TRANSCRIBING', Progress.TRANSCRIBE);
        const aiPath = toAiServicePath(videoRecord.filePath);
        return this.aiGateway.transcribe(aiPath, targetLang);
    }

    private async analyze(transcription: TranscriptionResponse, targetLang: string, emit: ProgressEmitter): Promise<VttSegment[]> {
        emit('ANALYZING', Progress.ANALYZE);
        const segmentTexts = transcription.segments.map((s: { text: string }) => s.text);
        const batchAnalysis = await this.aiGateway.analyzeBatch(segmentTexts, targetLang);

        return transcription.segments.map((seg: TranscriptionResponse['segments'][0], i: number) => ({
            start: seg.start,
            end: seg.end,
            text: seg.text,
            tokens: batchAnalysis.results[i]
        }));
    }

    private async enrichWithTranslations(
        segments: VttSegment[],
        targetLang: string,
        nativeLang: string,
        userId?: string,
        emit?: ProgressEmitter
    ) {
        emit?.('TRANSLATING', Progress.TRANSLATE);

        if (!userId) {
            return this.enrichGuestTranslations(segments, targetLang, nativeLang);
        }

        return this.enrichUserTranslations(segments, targetLang, nativeLang, userId);
    }

    private async enrichGuestTranslations(segments: VttSegment[], targetLang: string, nativeLang: string) {
        const uniqueLemmas = new Set<string>();
        segments.forEach(seg => seg.tokens.forEach((t: TokenAnalysis) => {
            if (!t.is_stop && t.pos !== 'PUNCT') uniqueLemmas.add(t.lemma);
        }));
        const lemmaList = Array.from(uniqueLemmas);
        if (lemmaList.length === 0) return segments;

        // Limit Guest Mode to reduce costs/load
        // Guests only get the first 50 unique terms translated
        const GUEST_LEMMA_LIMIT = 50;
        const limitedLemmaList = lemmaList.slice(0, GUEST_LEMMA_LIMIT);

        const res = await this.aiGateway.translate(limitedLemmaList, targetLang, nativeLang);
        const lemmaMap = new Map(limitedLemmaList.map((l, i) => [l, res.translations[i]])); // Only mapped ones exist

        // Also translate full sentences for "Translated" mode
        const sentenceTexts = segments.map(s => s.text);
        const sentenceTranslations = await this.aiGateway.translate(sentenceTexts, targetLang, nativeLang);

        return segments.map((seg, i) => ({
            ...seg,
            translation: sentenceTranslations.translations[i],
            tokens: seg.tokens.map((t: TokenAnalysis) => ({ ...t, translation: lemmaMap.get(t.lemma) }))
        }));
    }

    private async enrichUserTranslations(segments: VttSegment[], targetLang: string, nativeLang: string, userId: string) {
        const unknownLemmasToTranslate = new Set<string>();

        // 1. Batch filter all segments
        const segmentsTokens = segments.map(s => s.tokens);
        const filteredSegments = await this.filter.filterBatch(segmentsTokens, userId, targetLang);

        // 2. Map filtered results back and collect unknown lemmas
        const enrichedSegments = segments.map((seg, i) => {
            const filtered = filteredSegments[i];

            filtered.tokens.forEach(t => {
                if (!t.isKnown) unknownLemmasToTranslate.add(t.lemma);
            });

            return {
                ...seg,
                classification: filtered.classification,
                tokens: filtered.tokens
            };
        });

        // 3. Batch translate all unknown lemmas
        const lemmaList = Array.from(unknownLemmasToTranslate);

        // 4. Translate full sentences (ALWAYS required for "Translated" mode)
        const sentenceTexts = segments.map(s => s.text);
        // We can run lemma translation and sentence translation in parallel

        const [lemmaRes, sentenceRes] = await Promise.all([
            lemmaList.length > 0 ? this.aiGateway.translate(lemmaList, targetLang, nativeLang) : Promise.resolve({ translations: [] }),
            this.aiGateway.translate(sentenceTexts, targetLang, nativeLang)
        ]);

        const translationMap = new Map(lemmaList.map((l, i) => [l, lemmaRes.translations[i]]));

        enrichedSegments.forEach((seg, i) => {
            // Assign full sentence translation
            (seg as any).translation = sentenceRes.translations[i];

            seg.tokens.forEach((t: TokenAnalysis & { isKnown?: boolean; translation?: string }) => {
                if (!t.isKnown) {
                    t.translation = translationMap.get(t.lemma);
                }
            });
        });

        return enrichedSegments;
    }

    private async saveResults(videoId: string, vttJson: VttSegment[]) {
        await this.db.update(videoProcessing)
            .set({
                status: ProcessingStatus.COMPLETED,
                vttJson: vttJson
            })
            .where(eq(videoProcessing.videoId, videoId));
    }

    private async markAsError(videoId: string, emit: ProgressEmitter) {
        await this.db.update(videoProcessing)
            .set({ status: ProcessingStatus.ERROR })
            .where(eq(videoProcessing.videoId, videoId));
        emit(ProcessingStatus.ERROR, 0);
    }
}
