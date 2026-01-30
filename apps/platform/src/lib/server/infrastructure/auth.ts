import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./database";
import * as schema from "@notflix/database";
import { env } from "$env/dynamic/private";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.user,
      session: schema.session,
    },
  }),
  user: {
    additionalFields: {
      nativeLang: {
        type: "string",
        defaultValue: "en",
      },
      targetLang: {
        type: "string",
        defaultValue: "es",
      },
      gameIntervalMinutes: {
        type: "number",
        defaultValue: 10,
      },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: false, // Let PostgreSQL generate UUIDs via defaultRandom()
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
