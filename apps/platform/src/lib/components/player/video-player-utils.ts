import type { SubtitleMode, Subtitle } from "./types";

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const PAD_LENGTH = 2;

const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

const SUBTITLE_MODES: SubtitleMode[] = ["OFF", "FILTERED", "DUAL", "ORIGINAL"];

const ERROR_MESSAGES: Record<number, string> = {
  [MEDIA_ERR_ABORTED]: "Playback aborted by user.",
  [MEDIA_ERR_NETWORK]: "Network error while downloading.",
  [MEDIA_ERR_DECODE]:
    "Video playback aborted due to a corruption problem or because the video used features your browser did not support.",
  [MEDIA_ERR_SRC_NOT_SUPPORTED]:
    "The video could not be loaded, either because the server or network failed or because the format is not supported (File might be missing).",
};

const DEFAULT_ERROR_MESSAGE = "Unknown error occurred";

const AUDIO_EXTENSIONS = [".m4a", ".mp3", ".wav"];

const PROGRESS_REPORT_INTERVAL_SECONDS = 5;
const PERCENTAGE_BASE = 100;

export {
  MEDIA_ERR_ABORTED,
  MEDIA_ERR_NETWORK,
  MEDIA_ERR_DECODE,
  MEDIA_ERR_SRC_NOT_SUPPORTED,
};

/**
 * Formats a duration in seconds to a human-readable time string.
 * Returns H:MM:SS for durations >= 1 hour, otherwise M:SS.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / SECONDS_IN_HOUR);
  const mins = Math.floor((totalSeconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
  const secs = totalSeconds % SECONDS_IN_MINUTE;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(PAD_LENGTH, "0")}:${secs.toString().padStart(PAD_LENGTH, "0")}`;
  }

  return `${mins}:${secs.toString().padStart(PAD_LENGTH, "0")}`;
}

/**
 * Maps a MediaError code to a user-friendly message.
 * Returns a default message for unknown codes.
 */
export function getMediaErrorMessage(code: number): string {
  return ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
}

/**
 * Returns the next subtitle mode in the cycle: OFF -> FILTERED -> DUAL -> ORIGINAL -> OFF.
 */
export function getNextSubtitleMode(current: SubtitleMode): SubtitleMode {
  const idx = SUBTITLE_MODES.indexOf(current);
  return SUBTITLE_MODES[(idx + 1) % SUBTITLE_MODES.length];
}

/**
 * Returns true if the file path is an audio-only file (mp3/m4a).
 */
export function isAudioFile(filePath: string): boolean {
  const lower = (filePath ?? "").toLowerCase().split(/[?#]/, 1)[0];
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Calculates the next game interrupt time based on interval and chunk index.
 * Returns Infinity if intervalSeconds is 0 or negative.
 */
export function calculateNextInterrupt(
  intervalSeconds: number,
  chunkIndex: number,
): number {
  if (intervalSeconds <= 0) return Infinity;
  return intervalSeconds * (chunkIndex + 1);
}

/**
 * Returns the CSS class string for a transcript item based on its state.
 */
export function getTranscriptItemClass(
  currentTime: number,
  subtitle: Subtitle,
): string {
  const isCurrent = currentTime >= subtitle.start && currentTime < subtitle.end;

  if (isCurrent) {
    return "border-amber-400/70 bg-white/10";
  }

  if (subtitle.classification === "LEARNING") {
    return "border-amber-500/30";
  }

  if (subtitle.classification === "HARD") {
    return "border-red-500/30";
  }

  return "border-white/10";
}

/**
 * Marks all words matching the given lemma as known across all subtitles.
 */
export function markWordKnown(
  subtitles: Subtitle[],
  lemma: string,
): Subtitle[] {
  return subtitles.map((subtitle) => ({
    ...subtitle,
    words: subtitle.words?.map((word) =>
      word.lemma === lemma
        ? { ...word, isKnown: true, difficulty: "easy" as const }
        : word,
    ),
  }));
}

/**
 * Determines whether progress should be reported based on time elapsed since last report.
 */
export function shouldReportProgress(
  currentTime: number,
  duration: number,
  lastReportedSecond: number,
): boolean {
  const roundedCurrentTime = Math.round(currentTime);
  const roundedDuration = Math.round(duration);
  if (roundedDuration <= 0) return false;
  return (
    Math.abs(roundedCurrentTime - lastReportedSecond) >=
    PROGRESS_REPORT_INTERVAL_SECONDS
  );
}

/**
 * Calculates the progress percentage from current time and duration.
 */
export function calcProgressPercent(
  currentTime: number,
  duration: number,
): number {
  const roundedDuration = Math.round(duration);
  if (roundedDuration <= 0) return 0;
  const percent = (currentTime / duration) * PERCENTAGE_BASE;
  return Math.min(PERCENTAGE_BASE, Math.max(0, percent));
}
