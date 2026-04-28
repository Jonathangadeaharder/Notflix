import { EventEmitter } from 'events';
import type { LanguageCode, ProgressStageType } from '$lib/types';

export interface AppEventPayloads {
  'video.upload.completed': {
    videoId: string;
    targetLang: LanguageCode;
    nativeLang: LanguageCode;
    userId: string;
  };
  'video.processing.started': {
    videoId: string;
    targetLang: LanguageCode;
    nativeLang: LanguageCode;
    userId: string;
  };
  'video.processing.progress': {
    videoId: string;
    targetLang: LanguageCode;
    stage: ProgressStageType;
    percent: number;
  };
  'video.processing.completed': {
    videoId: string;
    targetLang: LanguageCode;
    vttJson: unknown;
  };
  'video.processing.failed': {
    videoId: string;
    targetLang: LanguageCode;
    error: string;
  };
}

export type EventKey = keyof AppEventPayloads;

export interface TypedEventEmitter {
  on<K extends EventKey>(
    event: K,
    listener: (payload: AppEventPayloads[K]) => void | Promise<void>,
  ): this;
  prependListener<K extends EventKey>(
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
  emitAsync<K extends EventKey>(
    event: K,
    payload: AppEventPayloads[K],
  ): Promise<boolean>;
}

export class AppEventBus extends EventEmitter implements TypedEventEmitter {
  constructor() {
    super();
    // Allow enough listeners per event without throwing memory leak warnings
    this.setMaxListeners(20);
  }

  override on<K extends EventKey>(
    event: K,
    listener: (payload: AppEventPayloads[K]) => void | Promise<void>,
  ): this {
    return super.on(event, listener);
  }

  override prependListener<K extends EventKey>(
    event: K,
    listener: (payload: AppEventPayloads[K]) => void | Promise<void>,
  ): this {
    return super.prependListener(event, listener);
  }

  override once<K extends EventKey>(
    event: K,
    listener: (payload: AppEventPayloads[K]) => void | Promise<void>,
  ): this {
    return super.once(event, listener);
  }

  override off<K extends EventKey>(
    event: K,
    listener: (payload: AppEventPayloads[K]) => void | Promise<void>,
  ): this {
    return super.off(event, listener);
  }

  override emit<K extends EventKey>(
    event: K,
    payload: AppEventPayloads[K],
  ): boolean {
    return super.emit(event, payload);
  }

  async emitAsync<K extends EventKey>(
    event: K,
    payload: AppEventPayloads[K],
  ): Promise<boolean> {
    const listeners = this.listeners(event) as Array<
      (payload: AppEventPayloads[K]) => void | Promise<void>
    >;

    if (listeners.length === 0) {
      return false;
    }

    // Sequential, in registration order — persistence handlers must finish
    // before downstream pipeline handlers emit follow-up events.
    for (const listener of listeners) {
      await listener(payload);
    }
    return true;
  }
}

// Global singleton
export const eventBus = new AppEventBus();
