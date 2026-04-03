import { globalEvents, EVENTS, type VideoUploadedPayload } from '../infrastructure/event-bus';
import { ProcessingStatus } from '../infrastructure/config';

export function triggerPipeline(payload: VideoUploadedPayload): Promise<void> {
    return new Promise((resolve, reject) => {
        const onUpdate = (data: { videoId: string; status: string }) => {
            if (data.videoId === payload.videoId) {
                if (data.status === ProcessingStatus.COMPLETED) {
                    cleanup();
                    resolve();
                } else if (data.status === ProcessingStatus.ERROR) {
                    cleanup();
                    reject(new Error(`Pipeline failed for ${payload.videoId}`));
                }
            }
        };

        const cleanup = () => {
            globalEvents.off(EVENTS.PROCESSING_UPDATE, onUpdate);
        };

        globalEvents.on(EVENTS.PROCESSING_UPDATE, onUpdate);

        // Dispatch the choreography
        globalEvents.emit(EVENTS.VIDEO_UPLOADED, payload);
    });
}
