import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { vocabReference } from "./schema";
import { parseLemmasFromCsv } from "./seed-csv";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://admin:password@127.0.0.1:5432/main_db";
const client = postgres(connectionString);
const db = drizzle(client);

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
const BATCH_SIZE = 500;

async function seed() {
  console.log("Seeding vocab_reference...");

  for (const level of LEVELS) {
    const csvPath = path.resolve(process.cwd(), `assets/vocab/es/${level}.csv`);

    if (!fs.existsSync(csvPath)) {
      console.warn(`Missing: ${csvPath}`);
      continue;
    }

    const lemmas = parseLemmasFromCsv(csvPath);

    for (let i = 0; i < lemmas.length; i += BATCH_SIZE) {
      const batch = lemmas.slice(i, i + BATCH_SIZE).map((lemma) => ({
        lemma,
        lang: "es",
        level,
        isProperNoun: false,
      }));
      await db.insert(vocabReference).values(batch).onConflictDoNothing();
      process.stdout.write(".");
    }

    console.log(` ${level}: ${lemmas.length} words`);
  }

  console.log("\nSeeding complete!");
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  seed()
    .then(() => {
      process.exitCode = 0;
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exitCode = 1;
    })
    .finally(() => {
      client.end();
    });
}
