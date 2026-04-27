import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleVideoUpload } from './upload-video.service';

const TEST_UPLOAD_DIR = join(process.cwd(), '.test-uploads');

function createDependencies() {
  return {
    uploadDir: TEST_UPLOAD_DIR,
    defaultNativeLang: 'en',
    maxFileSizeBytes: 500 * 1024 * 1024,
    createVideoId: vi.fn().mockReturnValue('video-123'),
    saveFileToStorage: vi.fn().mockResolvedValue(undefined),
    insertVideo: vi.fn().mockResolvedValue(undefined),
    queueProcessingEvent: vi.fn().mockResolvedValue(undefined),
  };
}

function createSessionUser() {
  return { id: 'user-1', nativeLang: 'en' } as never;
}

describe('handleVideoUpload — file validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects files exceeding the maximum size limit', async () => {
    const deps = createDependencies();
    const oversizedFile = new File(['x'.repeat(100)], 'big.mp4', {
      type: 'video/mp4',
    });
    Object.defineProperty(oversizedFile, 'size', { value: 600 * 1024 * 1024 });

    const result = await handleVideoUpload(
      { title: 'Big Video', targetLang: 'es', file: oversizedFile },
      createSessionUser(),
      deps,
    );

    expect(result.ok).toBe(false);
    expect(
      (result as { ok: false; value: { errors: { file: unknown } } }).value
        .errors.file,
    ).toBeDefined();
    expect(deps.saveFileToStorage).not.toHaveBeenCalled();
  });

  it('rejects files with disallowed extensions', async () => {
    const deps = createDependencies();
    const htmlFile = new File(['<script>alert(1)</script>'], 'evil.html', {
      type: 'text/html',
    });

    const result = await handleVideoUpload(
      { title: 'Evil File', targetLang: 'es', file: htmlFile },
      createSessionUser(),
      deps,
    );

    expect(result.ok).toBe(false);
    expect(
      (result as { ok: false; value: { errors: { file: unknown } } }).value
        .errors.file,
    ).toBeDefined();
    expect(deps.saveFileToStorage).not.toHaveBeenCalled();
  });

  it('rejects files with no extension', async () => {
    const deps = createDependencies();
    const noExtFile = new File(['data'], 'noext', { type: '' });

    const result = await handleVideoUpload(
      { title: 'No Extension', targetLang: 'es', file: noExtFile },
      createSessionUser(),
      deps,
    );

    expect(result.ok).toBe(false);
    expect(
      (result as { ok: false; value: { errors: { file: unknown } } }).value
        .errors.file,
    ).toBeDefined();
    expect(deps.saveFileToStorage).not.toHaveBeenCalled();
  });

  it('accepts valid MP4 files within size limit', async () => {
    const deps = createDependencies();
    const validFile = new File(['video-data'], 'test.mp4', {
      type: 'video/mp4',
    });

    const result = await handleVideoUpload(
      { title: 'Good Video', targetLang: 'es', file: validFile },
      createSessionUser(),
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.saveFileToStorage).toHaveBeenCalled();
  });

  it('accepts valid MP3 files within size limit', async () => {
    const deps = createDependencies();
    const validFile = new File(['audio-data'], 'test.mp3', {
      type: 'audio/mpeg',
    });

    const result = await handleVideoUpload(
      { title: 'Good Audio', targetLang: 'es', file: validFile },
      createSessionUser(),
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.saveFileToStorage).toHaveBeenCalled();
  });
});
