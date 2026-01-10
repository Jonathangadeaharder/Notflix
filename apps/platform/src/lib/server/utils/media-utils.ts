import path from 'path';
import { CONFIG } from '../infrastructure/config';

/**
 * Converts an absolute filesystem path to a relative URL for the media proxy.
 * e.g. "E:/project/media/uploads/video.mp4" -> "/media/uploads/video.mp4"
 */
export function toMediaUrl(absolutePath: string | null | undefined): string {
    if (!absolutePath) return '';
    if (absolutePath.startsWith('http') || absolutePath.startsWith('/')) return absolutePath;

    const mediaRoot = path.resolve(CONFIG.RESOLVED_UPLOAD_DIR, '..');

    // Normalize paths for Windows/Linux comparison
    const normalizedAbs = path.normalize(absolutePath);
    const normalizedRoot = path.normalize(mediaRoot);

    if (normalizedAbs.startsWith(normalizedRoot)) {
        const relative = normalizedAbs.slice(normalizedRoot.length);
        // Ensure forward slashes for URLs, handling both OS styles safely
        return '/media' + relative.replace(/\\/g, '/');
    }

    return absolutePath;
}
