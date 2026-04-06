import type {
  Session as BaseSession,
  User as BaseUser,
} from "$lib/server/infrastructure/auth";

declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }
    interface Locals {
      auth: () => Promise<BaseSession | null>;
      aiGateway: import("$lib/server/domain/interfaces").IAiGateway;
      smartFilter: import("$lib/server/services/linguistic-filter.service").SmartFilter;
      subtitleService: import("$lib/server/services/subtitle.service").SubtitleService;
      db: typeof import("$lib/server/infrastructure/database").db;
    }
    interface PageData {
      user: BaseUser | null;
      session: BaseSession | null;
    }
    interface ActionData {
      success?: boolean;
      errors?: Record<string, string[]>;
      data?: Record<string, unknown>;
    }
    interface Platform {
      env?: Record<string, string>;
    }
  }
}

export {};
