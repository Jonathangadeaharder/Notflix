import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/infrastructure/database";
import { sql } from "drizzle-orm";

export const GET: RequestHandler = async () => {
  try {
    // Basic DB connectivity check
    await db.execute(sql`SELECT 1`);

    return json({
      status: "ok",
      timestamp: Date.now(),
      services: {
        database: "connected",
      },
    });
  } catch (error) {
    return json(
      {
        status: "error",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
};
