import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
      vttJson: [],
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
      vttJson: [],
    });

    expect(success).toBe(true);
    expect(result).toBe('async-123');
  });

  it('emitAsync returns false when no listeners are registered', async () => {
    const bus = new AppEventBus();
    const success = await bus.emitAsync('video.processing.completed', {
      videoId: 'v-123',
      targetLang: 'es' as const,
      vttJson: [],
    });
    expect(success).toBe(false);
  });

  it('should expose a global singleton', () => {
    expect(eventBus).toBeInstanceOf(AppEventBus);
  });
});

// E1.6 — Event-bus migration verification
// Confirms video-orchestrator.service.ts has been deleted and no file in
// apps/platform/src imports it, ensuring ADR-007 choreography is the sole
// pipeline entrypoint.
describe('E1.6 event-bus migration', () => {
  const SRC_ROOT = new URL('../../..', import.meta.url).pathname;

  it('video-orchestrator.service.ts no longer exists in the repo', () => {
    const paths = [
      join(SRC_ROOT, 'lib/server/services/video-orchestrator.service.ts'),
      join(SRC_ROOT, 'lib/server/video-orchestrator.service.ts'),
      join(SRC_ROOT, 'video-orchestrator.service.ts'),
    ];
    for (const p of paths) {
      expect(existsSync(p), `Expected ${p} to be deleted`).toBe(false);
    }
  });

  it('pipeline-orchestrator subscribes to eventBus, not direct invocation', async () => {
    // Importing the orchestrator registers its eventBus listeners.
    // If the module compiled without importing video-orchestrator, the import
    // itself proves no hard coupling remains.
    const before = eventBus.listenerCount('video.processing.started');
    const onSpy = vi.spyOn(eventBus, 'on');

    const { orchestrator } = await import(
      '$lib/server/services/pipeline-orchestrator'
    );
    expect(orchestrator).toBeDefined();

    // eventBus should have at least one listener for video.processing.started
    expect(onSpy).toHaveBeenCalledWith(
      'video.processing.started',
      expect.any(Function),
    );
    expect(eventBus.listenerCount('video.processing.started')).toBeGreaterThan(
      before,
    );
  });
});
