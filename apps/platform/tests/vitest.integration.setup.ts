// Integration tests run against the live database (Docker or local).
// Set DATABASE_URL in your environment before running integration tests.
process.env.RUNNING_IN_DOCKER = process.env.RUNNING_IN_DOCKER || "false";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "[Integration] DATABASE_URL not set. Aborting integration test run."
  );
}
