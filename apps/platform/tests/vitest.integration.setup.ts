/* eslint-disable sonarjs/os-command, sonarjs/no-os-command-from-path */
import { execSync } from "node:child_process";

const PROJECT_CONTAINER = "notflix-db";
const PROJECT_PORT = 5432;
const TEST_CONTAINER = "notflix-test-db";
const TEST_PORT = 5433;
const DEFAULT_LOCAL_URL = `postgres://postgres:password@127.0.0.1:${PROJECT_PORT}/postgres`;

function docker(args: string, timeout = 5_000): string {
  return execSync(`docker ${args}`, { stdio: "pipe", timeout }).toString().trim();
}

function isDockerAvailable(): boolean {
  try {
    docker("info", 5_000);
    return true;
  } catch {
    return false;
  }
}

function waitForPort(port: number, maxMs = 20_000): boolean {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      execSync(
        `node -e "const net=require('net');const s=net.createConnection(${port},'127.0.0.1',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),1000)"`,
        { stdio: "pipe", timeout: 3_000 },
      );
      return true;
    } catch {
      execSync("sleep 1", { stdio: "pipe" });
    }
  }
  return false;
}

function isContainerRunning(name: string): boolean {
  try {
    return docker(`inspect -f '{{.State.Running}}' ${name}`) === "true";
  } catch {
    return false;
  }
}

function containerExists(name: string): boolean {
  try {
    docker(`inspect ${name}`, 3_000);
    return true;
  } catch {
    return false;
  }
}

function startExisting(name: string): boolean {
  try {
    docker(`start ${name}`, 10_000);
    return true;
  } catch {
    return false;
  }
}

function createTestContainer(): boolean {
  try {
    docker(
      `run -d --name ${TEST_CONTAINER} ` +
        `-p ${TEST_PORT}:5432 ` +
        `-e POSTGRES_PASSWORD=password ` +
        `-e POSTGRES_DB=postgres ` +
        `postgres:16-alpine`,
      30_000,
    );
    return true;
  } catch {
    return false;
  }
}

function removeContainer(name: string): void {
  try {
    docker(`rm -f ${name}`, 5_000);
  } catch {
    // doesn't exist
  }
}

function pushSchema(dbUrl: string): void {
  console.log("[Integration] Pushing schema...");
  execSync("pnpm exec drizzle-kit push --force", {
    stdio: "pipe",
    timeout: 30_000,
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  console.log("[Integration] Schema applied.");
}

function skip(msg: string): never {
  console.warn(`[Integration] ${msg}`);
  process.exit(0);
}

let dbUrl = "";
let cleanupContainer = "";

async function setup() {
  process.env.RUNNING_IN_DOCKER = process.env.RUNNING_IN_DOCKER || "false";

  if (process.env.SKIP_INTEGRATION_TESTS === "true") {
    skip("Skipping (SKIP_INTEGRATION_TESTS=true)");
  }

  const explicitUrl = process.env.INTEGRATION_DATABASE_URL || process.env.DATABASE_URL;
  const userProvidedUrl = explicitUrl && explicitUrl !== DEFAULT_LOCAL_URL;

  if (userProvidedUrl) {
    dbUrl = explicitUrl;
    console.log(`[Integration] Using provided DATABASE_URL`);
    try {
      pushSchema(dbUrl);
    } catch {
      console.warn("[Integration] Warning: could not push schema to provided DATABASE_URL.");
    }
    process.env.DATABASE_URL = dbUrl;
    return;
  }

  if (isDockerAvailable()) {
    if (isContainerRunning(PROJECT_CONTAINER)) {
      dbUrl = DEFAULT_LOCAL_URL;
      console.log(`[Integration] Using running project container "${PROJECT_CONTAINER}"`);
    } else if (containerExists(PROJECT_CONTAINER) && startExisting(PROJECT_CONTAINER)) {
      dbUrl = DEFAULT_LOCAL_URL;
      console.log(`[Integration] Started existing project container "${PROJECT_CONTAINER}"`);
      cleanupContainer = PROJECT_CONTAINER;
    } else if (isContainerRunning(TEST_CONTAINER)) {
      dbUrl = `postgres://postgres:password@127.0.0.1:${TEST_PORT}/postgres`;
      console.log(`[Integration] Reusing test container "${TEST_CONTAINER}"`);
    } else {
      removeContainer(TEST_CONTAINER);
      if (createTestContainer()) {
        dbUrl = `postgres://postgres:password@127.0.0.1:${TEST_PORT}/postgres`;
        cleanupContainer = TEST_CONTAINER;
        console.log(`[Integration] Created test container "${TEST_CONTAINER}"`);
      }
    }

    if (dbUrl) {
      const port = dbUrl.includes(`:${TEST_PORT}/`) ? TEST_PORT : PROJECT_PORT;
      if (waitForPort(port)) {
        process.env.DATABASE_URL = dbUrl;
        pushSchema(dbUrl);
        return;
      }
      console.warn("[Integration] Container started but port not reachable. Falling through.");
      dbUrl = "";
    }
  }

  if (waitForPort(PROJECT_PORT, 2_000)) {
    dbUrl = DEFAULT_LOCAL_URL;
    process.env.DATABASE_URL = dbUrl;
    console.log("[Integration] Found Postgres on default port without Docker.");
    try {
      pushSchema(dbUrl);
    } catch {
      console.warn("[Integration] Postgres reachable but schema push failed. Tests may fail.");
    }
    return;
  }

  skip(
    "No Postgres available. Start one with: docker compose up db, or set DATABASE_URL.",
  );
}

async function teardown() {
  if (cleanupContainer) {
    console.log(`[Integration] Stopping container "${cleanupContainer}"...`);
    try {
      docker(`stop ${cleanupContainer}`, 10_000);
    } catch {
      // best effort
    }
  }
}

export { setup, teardown };
