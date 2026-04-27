import { describe, expect, it, vi } from 'vitest';
import { AppEventBus, type AppEventPayloads, eventBus } from './event-bus';

describe('AppEventBus', () => {
  it('should emit and receive strongly typed events', () => {
    const bus = new AppEventBus();
    const listener = vi.fn();

    bus.on('video.processing.started', listener);

    const payload = {
      videoId: 'v-123',
      targetLang: 'es' as const,
      nativeLang: 'en' as const,
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
      targetLang: 'es' as const,
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should support async emission with emitAsync', async () => {
    const bus = new AppEventBus();

    let result = '';
    const listener = async (
      payload: AppEventPayloads['video.processing.completed'],
    ) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      result = payload.videoId;
    };

    bus.on('video.processing.completed', listener);

    const success = await bus.emitAsync('video.processing.completed', {
      videoId: 'async-123',
      targetLang: 'es' as const,
    });

    expect(success).toBe(true);
    expect(result).toBe('async-123');
  });

  it('emitAsync returns false when no listeners are registered', async () => {
    const bus = new AppEventBus();
    const success = await bus.emitAsync('video.processing.completed', {
      videoId: 'v-123',
      targetLang: 'es' as const,
    });
    expect(success).toBe(false);
  });

  it('should expose a global singleton', () => {
    expect(eventBus).toBeInstanceOf(AppEventBus);
  });
});
