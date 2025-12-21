import { db as defaultDb } from '../infrastructure/database';
import { video, videoProcessing, type DbVttSegment } from '@notflix/database';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { aiGateway as defaultAiGateway, smartFilter as defaultFilter } from '../infrastructure/container';
import type { IAiGateway, TranscriptionResponse, TokenAnalysis } from '../domain/interfaces';
import { globalEvents, EVENTS } from '../infrastructure/event-bus';
import { CONFIG, ProcessingStatus } from '../infrastructure/config';
import type { SmartFilter } from './linguistic-filter.service';

// Infer types from schema
type VideoRecord = InferSelectModel<typeof video>;

type ProgressEmitter = (status: string, percent: number) => void;

// VTT Segment for application logic (mapping DbVttSegment to local needs if necessary)
export type VttSegment = DbVttSegment;

export class Orchestrator {
    constructor(
        private aiGateway: IAiGateway = defaultAiGateway,
        private db = defaultDb,
        private filter: SmartFilter = defaultFilter
    ) {}

    async processVideo(
        videoId: string, 
        targetLang: string = CONFIG.DEFAULT_TARGET_LANG, 
        nativeLang: string = CONFIG.DEFAULT_NATIVE_LANG, 
        userId?: string
    ) {
        const emitProgress: ProgressEmitter = (status: string, percent: number) => {
            globalEvents.emit(EVENTS.PROCESSING_UPDATE, { videoId, status, percent });
        };

        console.log(`[Orchestrator] Starting processing for video: ${videoId}, User: ${userId}`);
        emitProgress('STARTING', 0);

        const videoRecord = await this.getVideoRecord(videoId);
        await this.initProcessingRecord(videoId, targetLang);

        try {
            await this.generateThumbnail(videoRecord, videoId, emitProgress);
            const transcription = await this.transcribe(videoRecord, targetLang, emitProgress);
            const analyzedSegments = await this.analyze(transcription, targetLang, emitProgress);
            const finalSegments = await this.enrichWithTranslations(analyzedSegments, targetLang, nativeLang, userId, emitProgress);
            
            await this.saveResults(videoId, finalSegments);

            emitProgress(ProcessingStatus.COMPLETED, 100);
            console.log(`[Orchestrator] Processing finished successfully.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error(`[Orchestrator] Processing Failed:`, errorMessage);
            await this.markAsError(videoId, emitProgress);
            throw err;
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

    private async initProcessingRecord(videoId: string, targetLang: string) {
        await this.db.insert(videoProcessing).values({
            videoId,
            targetLang,
            status: ProcessingStatus.PENDING,
        }).onConflictDoUpdate({
            target: [videoProcessing.videoId, videoProcessing.targetLang],
            set: { status: ProcessingStatus.PENDING, vttJson: null }
        });
    }

    private async generateThumbnail(videoRecord: VideoRecord, videoId: string, emit: ProgressEmitter) {
        emit('THUMBNAIL_GENERATION', 5);
        try {
            const thumbRes = await this.aiGateway.generateThumbnail(videoRecord.filePath);
            await this.db.update(video)
                .set({ thumbnailPath: thumbRes.thumbnail_path })
                .where(eq(video.id, videoId));
        } catch (err) {
            console.error(`[Orchestrator] Thumbnail failed (non-critical):`, err);
        }
    }

    private async transcribe(videoRecord: VideoRecord, targetLang: string, emit: ProgressEmitter) {
        emit('TRANSCRIBING', 10);
        return this.aiGateway.transcribe(videoRecord.filePath, targetLang);
    }

    private async analyze(transcription: TranscriptionResponse, targetLang: string, emit: ProgressEmitter): Promise<VttSegment[]> {
        emit('ANALYZING', 50);
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
        emit?.('TRANSLATING', 80);

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

        const res = await this.aiGateway.translate(lemmaList, targetLang, nativeLang);
        const lemmaMap = new Map(lemmaList.map((l, i) => [l, res.translations[i]]));
        return segments.map(seg => ({
            ...seg,
            tokens: seg.tokens.map((t: TokenAnalysis) => ({ ...t, translation: lemmaMap.get(t.lemma) }))
        }));
    }

    private async enrichUserTranslations(segments: VttSegment[], targetLang: string, nativeLang: string, userId: string) {
        const enrichedSegments: VttSegment[] = [];
        const unknownLemmasToTranslate = new Set<string>();

        for (const seg of segments) {
            const filtered = await this.filter.filterSegment(seg.tokens, userId, targetLang);
            
            filtered.tokens.forEach(t => {
                if (!t.isKnown) unknownLemmasToTranslate.add(t.lemma);
            });

            enrichedSegments.push({
                ...seg,
                classification: filtered.classification,
                tokens: filtered.tokens
            });
        }

        const lemmaList = Array.from(unknownLemmasToTranslate);
        if (lemmaList.length > 0) {
            const res = await this.aiGateway.translate(lemmaList, targetLang, nativeLang);
            const translationMap = new Map(lemmaList.map((l, i) => [l, res.translations[i]]));
            
            enrichedSegments.forEach(seg => {
                seg.tokens.forEach((t: any) => {
                    if (!t.isKnown) {
                        t.translation = translationMap.get(t.lemma);
                    }
                });
            });
        }

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
