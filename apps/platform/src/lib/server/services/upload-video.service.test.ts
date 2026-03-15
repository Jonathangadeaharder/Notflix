import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { handleVideoUpload } from './upload-video.service';

const TEST_UPLOAD_DIR = join(process.cwd(), '.test-uploads');
const DEFAULT_NATIVE_LANG = 'en';

function createSessionUser() {
	return { id: 'user-1', nativeLang: 'de' } as never;
}

async function validateMissingFileScenario() {
	const deps = createDependencies();
	const result = await handleVideoUpload(
		{ title: 'My Video', targetLang: 'es', file: null },
		undefined,
		deps
	);

	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('Expected upload validation failure.');
	}

	expect(result.value.errors.file).toEqual(['File is required']);
	expect(deps.saveFileToStorage).not.toHaveBeenCalled();
	expect(deps.insertVideo).not.toHaveBeenCalled();
	expect(deps.queueTask).not.toHaveBeenCalled();
}

async function validateAuthenticatedUploadScenario() {
	const deps = createDependencies();
	const file = new File(['audio-content'], 'clip.mp3', { type: 'audio/mpeg' });
	const result = await handleVideoUpload(
		{ title: 'Spanish Drill', targetLang: 'es', file },
		createSessionUser(),
		deps
	);

	expect(result.ok).toBe(true);
	const expectedFilePath = join(TEST_UPLOAD_DIR, 'video-123.mp3');
	expect(deps.saveFileToStorage).toHaveBeenCalledWith(file, expectedFilePath);
	expect(deps.insertVideo).toHaveBeenCalledWith(
		expect.objectContaining({
			id: 'video-123',
			title: 'Spanish Drill',
			filePath: expectedFilePath,
			thumbnailPath: '/placeholder.jpg',
			published: true,
			views: 0
		})
	);
	expect(deps.processVideo).toHaveBeenCalledWith('video-123', 'es', 'de', 'user-1');
	expect(deps.queueTask).toHaveBeenCalledWith('processVideo:video-123', expect.any(Promise));
}

async function validateGuestUploadFallbackScenario() {
	const deps = createDependencies();
	const file = new File(['plain-content'], 'clip', { type: 'application/octet-stream' });

	await handleVideoUpload({ title: 'Guest upload', targetLang: 'es', file }, undefined, deps);

	expect(deps.saveFileToStorage).toHaveBeenCalledWith(file, join(TEST_UPLOAD_DIR, 'video-123.bin'));
	expect(deps.processVideo).toHaveBeenCalledWith('video-123', 'es', DEFAULT_NATIVE_LANG, undefined);
}

function createDependencies() {
	return {
		uploadDir: TEST_UPLOAD_DIR,
		defaultNativeLang: DEFAULT_NATIVE_LANG,
		createVideoId: vi.fn().mockReturnValue('video-123'),
		saveFileToStorage: vi.fn().mockResolvedValue(undefined),
		insertVideo: vi.fn().mockResolvedValue(undefined),
		queueTask: vi.fn(),
		processVideo: vi.fn().mockResolvedValue(undefined)
	};
}

describe('handleVideoUpload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns validation errors when file is missing', async () => {
		expect.hasAssertions();
		await validateMissingFileScenario();
	});

	it('persists the video and queues processing for authenticated users', async () => {
		expect.hasAssertions();
		await validateAuthenticatedUploadScenario();
	});

	it('falls back to default native language for guest uploads', async () => {
		expect.hasAssertions();
		await validateGuestUploadFallbackScenario();
	});
});
