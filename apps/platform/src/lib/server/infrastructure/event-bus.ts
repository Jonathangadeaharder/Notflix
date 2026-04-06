import { EventEmitter } from "events";

export type VideoUploadedPayload = {
  videoId: string;
  targetLang: string;
  nativeLang: string;
  userId?: string;
};
export type TranscriptionCompletedPayload = VideoUploadedPayload & {
  transcription: any;
};
export type AnalysisCompletedPayload = VideoUploadedPayload & {
  segments: any[];
};

class GlobalEvents extends EventEmitter {}

export const globalEvents = new GlobalEvents();

export const EVENTS = {
  PROCESSING_UPDATE: "processing:update",
  VIDEO_UPLOADED: "video:uploaded",
  TRANSCRIPTION_COMPLETED: "video:transcription_completed",
  ANALYSIS_COMPLETED: "video:analysis_completed",
};
