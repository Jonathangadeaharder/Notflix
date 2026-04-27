import { describe, expect, it, vi } from 'vitest';
import { ProgressStage } from '$lib/types';
import { AppEventBus, eventBus } from './event-bus';

describe('AppEventBus', () => {
  it('should emit and receive strongly typed events', () => {
    const bus = new AppEventBus();
    const listener = vi.fn();

    bus.on('video.processing.started', listener);

    const payload = {
      videoId: 'v-123',
      targetLang: 'es',
      nativeLang: 'en',
      userId: 'u-123',
    };

    bus.emit('video.processing.started', payload);

    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('should stop receiving events after off() is called', () => {
    const bus = new AppEventBus();
    const listener = vi.fn();

    bus.on('video.processing.completed', listener);
    bus.off('video.processing.completed', listener);

    bus.emit('video.processing.completed', {
      videoId: 'v-123',
      targetLang: 'es',
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should expose a global singleton', () => {
    expect(eventBus).toBeInstanceOf(AppEventBus);
  });
});
