import { TIME } from '$lib/constants';

export type SrtSegment = {
    index: number;
    start: string;
    end: string;
    text: string;
};

export function parseSrt(srtContent: string): SrtSegment[] {
    const segments: SrtSegment[] = [];
    const blocks = srtContent.trim().split(/\n\s*\n/);

    for (const block of blocks) {
        const lines = block.split('\n');
        const MIN_LINES_PER_BLOCK = 3;
        if (lines.length >= MIN_LINES_PER_BLOCK) {
            const index = parseInt(lines[0], 10);
            const timeCode = lines[1].split(' --> ');
            const HEADER_LINES = 2;
            const text = lines.slice(HEADER_LINES).join('\n');
            const EXPECTED_TIMECODE_PARTS = 2;
            if (timeCode.length === EXPECTED_TIMECODE_PARTS) {
                segments.push({
                    index,
                    start: timeCode[0].trim(),
                    end: timeCode[1].trim(),
                    text
                });
            }
        }
    }
    return segments;
}

export function generateSrt(segments: SrtSegment[]): string {
    return segments.map(seg => {
        return `${seg.index}\n${seg.start} --> ${seg.end}\n${seg.text}`;
    }).join('\n\n');
}

export function generateVtt(segments: SrtSegment[]): string {
    const body = segments.map(seg => {
        const start = seg.start.replace(',', '.');
        const end = seg.end.replace(',', '.');
        return `${start} --> ${end}\n${seg.text}`;
    }).join('\n\n');
    return `WEBVTT\n\n${body}`;
}

export function secondsToSrtTime(seconds: number): string {
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    
    const SECONDS_IN_HOUR = 3600;
    const MILLISECONDS_IN_SECOND = 1000;
    const ISO_START_INDEX = 14;
    const ISO_LENGTH = 5;

    const hours = Math.floor(seconds / SECONDS_IN_HOUR);
    const ms = Math.floor((seconds % 1) * MILLISECONDS_IN_SECOND);
    
    // We can't easily use Date for > 24h, manual math is safer for SRT
    const date = new Date(0);
    date.setMilliseconds(seconds * MILLISECONDS_IN_SECOND);
    const mm = date.toISOString().substr(ISO_START_INDEX, ISO_LENGTH);
    return `${pad(hours, TIME.PADDING_DIGITS)}:${mm},${pad(ms, TIME.MS_DIGITS)}`;
}