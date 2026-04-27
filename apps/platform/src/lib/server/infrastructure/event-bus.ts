import { EventEmitter } from 'events';
import type { ProgressStageType } from '$lib/types';

export interface AppEventPayloads {
  'video.upload.completed': {
    videoId: string;
    targetLang: string;
    nativeLang: string;
    userId: string;
  };
  'video.processing.started': {
    videoId: string;
    targetLang: string;
    nativeLang: string;
    userId: string;
  };
  'video.processing.progress': {
    videoId: string;
    targetLang: string;
    stage: ProgressStageType;
    percent: number;
  };
  'video.processing.completed': {
    videoId: string;
    targetLang: string;
  };
  'video.processing.failed': {
    videoId: string;
    targetLang: string;
    error: string;
  };
}

export type EventKey = keyof AppEventPayloads;

export interface TypedEventEmitter {
  on<K extends EventKey>(
    event: K,
    listener: (payload: AppEventPayloads[K]) => void | Promise<void>,
  ): this;
  once<K extends EventKey>(
    event: K,
    listener: (payload: AppEventPayloads[K]) => void | Promise<void>,
  ): this;
  off<K extends EventKey>(
    event: K,
    listener: (payload: AppEventPayloads[K]) => void | Promise<void>,
  ): this;
  emit<K extends EventKey>(event: K, payload: AppEventPayloads[K]): boolean;
}

export class AppEventBus extends EventEmitter implements TypedEventEmitter {
  constructor() {
    super();
    // Allow enough listeners per event without throwing memory leak warnings
    this.setMaxListeners(20);
  }
}

// Global singleton
export const eventBus = new AppEventBus();
