import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { CONFIG } from "./config";
import * as schema from "@notflix/database";

let _client: postgres.Sql | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

export const db = new Proxy(
  {},
  {
    get(target, prop) {
      if (!_db) {
        _client = postgres(CONFIG.DATABASE_URL);
        _db = drizzle(_client, { schema });
      }
      return (_db as any)[prop];
    },
  },
) as any as ReturnType<typeof drizzle>;
