import { db as defaultDb } from '../infrastructure/database';
import { videoProcessing, type DbVttSegment, type DbTokenAnalysis } from '@notflix/database';
import { eq } from 'drizzle-orm';
import { generateSrt, secondsToSrtTime } from '../utils/subtitle-utils';

export type SubtitleMode = 'native' | 'translated' | 'bilingual';

export class SubtitleService {
    constructor(private db = defaultDb) {}

    async getSrt(videoId: string, mode: SubtitleMode = 'native'): Promise<string | null> {
        const [processing] = await this.db.select()
            .from(videoProcessing)
            .where(eq(videoProcessing.videoId, videoId))
            .limit(1);

        if (!processing || !processing.vttJson) {
            return null;
        }

        const segments = processing.vttJson as DbVttSegment[];
        
        const srtSegments = segments.map((seg, i) => {
            const nativeText = seg.text;
            const translatedText = seg.tokens
                .map((t: DbTokenAnalysis & { isKnown?: boolean }) => t.isKnown ? t.text : `[${t.translation || t.text}]`)
                .join('');

            let text = '';
            if (mode === 'native') {
                text = nativeText;
            } else if (mode === 'translated') {
                text = translatedText;
            } else if (mode === 'bilingual') {
                text = `${nativeText}\n${translatedText}`;
            }

            return {
                index: i + 1,
                start: secondsToSrtTime(seg.start),
                end: secondsToSrtTime(seg.end),
                text: text
            };
        });

        return generateSrt(srtSegments);
    }
}
