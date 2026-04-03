import { LANGUAGES } from '$lib/constants';
import { orchestrator } from '$lib/server/infrastructure/container';
import { taskRegistry } from '$lib/server/services/task-registry.service';

const DEFAULT_TARGET_LANGUAGE = LANGUAGES.DEFAULT_TARGET;
const DEFAULT_NATIVE_LANGUAGE = LANGUAGES.DEFAULT_NATIVE;

type ProcessVideoDependencies = {
	queueTask: (name: string, task: Promise<unknown>) => void;
	processVideo: (videoId: string, targetLang: string, nativeLang: string, userId: string) => Promise<unknown>;
};

export type ProcessVideoPayload = {
	videoId: string;
	userId: string;
	targetLang?: string;
	nativeLang?: string;
};

export function startVideoProcessing(payload: ProcessVideoPayload, dependencies: ProcessVideoDependencies): void {
	if (!payload.videoId) {
		throw new Error('Missing videoId');
	}

	const targetLang = payload.targetLang || DEFAULT_TARGET_LANGUAGE;
	const nativeLang = payload.nativeLang || DEFAULT_NATIVE_LANGUAGE;
	const taskName = `processVideo:${payload.videoId}`;

	dependencies.queueTask(
		taskName,
		dependencies.processVideo(payload.videoId, targetLang, nativeLang, payload.userId)
	);
}

export function startVideoProcessingWithDefaults(payload: ProcessVideoPayload): void {
	startVideoProcessing(payload, {
		queueTask: (name, task) => taskRegistry.register(name, task),
		processVideo: (videoId, targetLang, nativeLang, userId) =>
			orchestrator.processVideo(videoId, targetLang, nativeLang, userId)
	});
}
