import { beforeAll, afterAll } from "vitest";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

let pgContainer: StartedPostgreSqlContainer;

process.env.RUNNING_IN_DOCKER = process.env.RUNNING_IN_DOCKER || "false";

beforeAll(async () => {
  // Spin up an ephemeral testing database
  pgContainer = await new PostgreSqlContainer("postgres:15-alpine")
    .withDatabase("notflix_test")
    .withUsername("test_user")
    .withPassword("test_password")
    .start();

  // Dynamically inject the connection URI for the actual system to consume
  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.INTEGRATION_DATABASE_URL = process.env.DATABASE_URL;

  console.log(
    `[Testcontainers] Ephemeral PostgreSQL running on ${process.env.DATABASE_URL}`,
  );

  // Push the Drizzle schema directly onto the ephemeral database
  console.log("[Testcontainers] Pushing database schema...");
  const { execSync } = await import("child_process");
  execSync("pnpm --filter @notflix/database run db:push", {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    stdio: "inherit",
  });
  console.log("[Testcontainers] Schema pushed perfectly.");
}, 60000); // Allow 60 seconds for pulling docker image

afterAll(async () => {
  if (pgContainer) {
    await pgContainer.stop();
    console.log("[Testcontainers] Ephemeral PostgreSQL stopped.");
  }
});
