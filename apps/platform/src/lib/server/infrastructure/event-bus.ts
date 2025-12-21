import { EventEmitter } from 'events';

class GlobalEvents extends EventEmitter {}

export const globalEvents = new GlobalEvents();

export const EVENTS = {
    PROCESSING_UPDATE: 'processing:update'
};
