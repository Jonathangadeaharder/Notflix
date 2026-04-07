// Integration tests run against the live database (Docker or local).
// Set DATABASE_URL in your environment before running integration tests.
process.env.RUNNING_IN_DOCKER = process.env.RUNNING_IN_DOCKER || "false";

if (!process.env.DATABASE_URL) {
  console.warn("[Integration] DATABASE_URL not set. Using default local connection.");
  process.env.DATABASE_URL = "postgres://postgres:password@127.0.0.1:5432/postgres";
}
