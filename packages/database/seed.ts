import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { vocabReference } from "./schema";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://admin:password@127.0.0.1:5432/main_db";
const client = postgres(connectionString);
const db = drizzle(client);

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
const BATCH_SIZE = 500;

// Each CSV has two columns: German_Lemma,Spanish_Translation
// We extract the Spanish translation (column index 1) as the vocab lemma.
function parseLemmasFromCsv(filePath: string): string[] {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  return lines
    .slice(1) // skip header row
    .map((line) => {
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      let lemma = cols[1]?.trim();
      if (lemma?.startsWith('"') && lemma?.endsWith('"')) {
        lemma = lemma.slice(1, -1).replace(/""/g, '"');
      }
      return lemma;
    })
    .filter((lemma): lemma is string => !!lemma);
}

async function seed() {
  console.log("🌱 Seeding vocab_reference...");

  for (const level of LEVELS) {
    const csvPath = path.resolve(
      __dirname,
      `../../assets/vocab/es/${level}.csv`,
    );

    if (!fs.existsSync(csvPath)) {
      console.warn(`⚠️  Missing: ${csvPath}`);
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

  console.log("\n✨ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
