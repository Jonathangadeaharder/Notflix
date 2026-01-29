import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { CONFIG } from "./config";
import * as schema from "@notflix/database";

const client = postgres(CONFIG.DATABASE_URL);
export const db = drizzle(client, { schema });
