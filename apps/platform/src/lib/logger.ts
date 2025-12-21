import pino from 'pino';

// This prints JSON to the server console
export const logger = pino({
    level: 'info',
    transport: {
        target: 'pino/file' // 'pino/file' effectively writes to stdout in Docker
    }
});
