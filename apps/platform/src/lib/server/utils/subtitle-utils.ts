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
            const text = lines.slice(2).join('\n');
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

export function secondsToSrtTime(seconds: number): string {
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    
    const SECONDS_IN_HOUR = 3600;
    const SECONDS_IN_MINUTE = 60;
    const MILLISECONDS_IN_SECOND = 1000;

    const hours = Math.floor(seconds / SECONDS_IN_HOUR);
    const minutes = Math.floor((seconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
    const secs = Math.floor(seconds % SECONDS_IN_MINUTE);
    const ms = Math.floor((seconds % 1) * MILLISECONDS_IN_SECOND);
    
    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
}