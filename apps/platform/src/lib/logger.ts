import pino from 'pino';

// This prints JSON to the server console
export const logger = pino({
    level: 'info',
    transport: {
        targets: [
            {
                target: 'pino/file',
                options: { destination: 1 } // stdout for Docker/Console
            },
            {
                target: 'pino/file',
                options: { destination: '../../logs/platform.log', mkdir: true }
            }
        ]
    }
});
