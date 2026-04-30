import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { MediaPathError, resolveMediaPath } from './media-path-security';

const TEST_TIMEOUT_MS = 5000;

function captureMediaPathError(fn: () => void): MediaPathError | undefined {
  try {
    fn();
    return undefined;
  } catch (err) {
    return err as MediaPathError;
  }
}

describe('resolveMediaPath', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-test-'));
  const mediaRoot = path.join(tmpDir, 'media');
  fs.mkdirSync(path.join(mediaRoot, 'uploads'), { recursive: true });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('WhenValidPathWithinMediaRoot_ThenResolves', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    const result = resolveMediaPath('uploads/video.mp4', mediaRoot);
    expect(result.fullPath).toContain('uploads/video.mp4');
    expect(path.isAbsolute(result.fullPath)).toBe(true);
    expect(result.contentType).toBe('video/mp4');
  });

  it('WhenPathTraversalWithDotDot_ThenRejected', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    const caught = captureMediaPathError(() =>
      resolveMediaPath('../../../etc/passwd', mediaRoot),
    );
    expect(caught).toBeInstanceOf(MediaPathError);
    expect(caught?.statusCode).toBe(403);
  });

  it('WhenSiblingPrefixTraversal_ThenRejected', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    const caught = captureMediaPathError(() =>
      resolveMediaPath('../media-evil/file.mp4', mediaRoot),
    );
    expect(caught).toBeInstanceOf(MediaPathError);
    expect(caught?.statusCode).toBe(403);
  });

  it('WhenUndefinedPath_ThenRejected', { timeout: TEST_TIMEOUT_MS }, () => {
    const caught = captureMediaPathError(() =>
      resolveMediaPath(undefined, mediaRoot),
    );
    expect(caught).toBeInstanceOf(MediaPathError);
    expect(caught?.statusCode).toBe(400);
  });

  it('WhenFilenameStartsWithDoubleDot_ThenAllowed', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    const result = resolveMediaPath('..cover.webp', mediaRoot);
    expect(result.contentType).toBe('image/webp');
  });

  it('WhenValidContentTypeMapping_ThenCorrectType', {
    timeout: TEST_TIMEOUT_MS,
  }, () => {
    const cases: [string, string][] = [
      ['file.mp4', 'video/mp4'],
      ['file.mp3', 'audio/mpeg'],
      ['file.wav', 'audio/wav'],
      ['file.jpg', 'image/jpeg'],
      ['file.jpeg', 'image/jpeg'],
      ['file.png', 'image/png'],
      ['file.webp', 'image/webp'],
      ['file.webm', 'video/webm'],
      ['file.m4a', 'audio/mp4'],
      ['file.aac', 'audio/aac'],
      ['file.ogg', 'audio/ogg'],
      ['file.mkv', 'video/x-matroska'],
      ['file.avi', 'video/x-msvideo'],
      ['file.mov', 'video/quicktime'],
      ['file.xyz', 'application/octet-stream'],
    ];
    for (const [filename, expectedType] of cases) {
      const result = resolveMediaPath(filename, mediaRoot);
      expect(result.contentType).toBe(expectedType);
    }
  });
});
