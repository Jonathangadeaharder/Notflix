import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '$lib/server/db/schema';
import { CONFIG } from './config';

let _client: postgres.Sql | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!_db) {
        _client = postgres(CONFIG.DATABASE_URL);
        _db = drizzle(_client, { schema });
      }
      return (_db as unknown as Record<string | symbol, unknown>)[prop];
    },
  },
) as ReturnType<typeof drizzle>;
