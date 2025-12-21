import type { Session as BaseSession, User as BaseUser } from "$lib/server/infrastructure/auth";

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			auth: () => Promise<BaseSession | null>;
			user: BaseUser | null;
			session: BaseSession | null;
		}
		interface PageData {
			user: BaseUser | null;
			session: BaseSession | null;
		}
		interface ActionData {
            success?: boolean;
            errors?: Record<string, string[]>;
            data?: any;
        }
		interface Platform {
			env?: Record<string, string>;
		}
	}
}

export {};