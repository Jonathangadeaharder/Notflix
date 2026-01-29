import { execSync } from "node:child_process";
import { connect } from "node:net";
import path from "node:path";

const DATABASE_URL = "postgres://admin:password@127.0.0.1:5432/main_db";
process.env.DATABASE_URL = DATABASE_URL;
process.env.RUNNING_IN_DOCKER = "false";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const containerName = "notflix-db";

function findCmd(candidates: string[]) {
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: "ignore" });
      return cmd;
    } catch {
      continue;
    }
  }
  return null;
}

function isPodman(cmd: string) {
  try {
    const output = execSync(`${cmd} --version`, { stdio: "pipe" })
      .toString()
      .toLowerCase();
    return output.includes("podman");
  } catch {
    return false;
  }
}

function ensurePodmanMachine(cmd: string) {
  try {
    const output = execSync(`${cmd} machine list --format "{{.Running}}"`, {
      stdio: "pipe",
    }).toString();
    if (!output.includes("true")) {
      try {
        execSync(`${cmd} machine start`, { stdio: "inherit" });
      } catch {
        execSync(`${cmd} machine init`, { stdio: "inherit" });
        execSync(`${cmd} machine start`, { stdio: "inherit" });
      }
    }
  } catch {
    try {
      execSync(`${cmd} machine start`, { stdio: "inherit" });
    } catch {
      execSync(`${cmd} machine init`, { stdio: "inherit" });
      execSync(`${cmd} machine start`, { stdio: "inherit" });
    }
  }
}

function getContainerCmd() {
  const dockerCmd = findCmd(["docker.exe", "docker"]);
  if (dockerCmd) {
    if (isPodman(dockerCmd)) {
      ensurePodmanMachine(dockerCmd);
    }
    return dockerCmd;
  }

  const podmanCmd = findCmd(["podman.exe", "podman"]);
  if (podmanCmd) {
    ensurePodmanMachine(podmanCmd);
    return podmanCmd;
  }

  throw new Error("No container runtime found (docker or podman).");
}

async function waitForPort(
  port: number,
  host = "127.0.0.1",
  timeoutMs = 30000,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = connect(port, host);
        socket.on("connect", () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Timeout waiting for ${host}:${port}`);
}

async function ensureDb() {
  const docker = getContainerCmd();
  let running = false;
  try {
    const output = execSync(
      `${docker} ps --filter "name=${containerName}" --format "{{.Names}}"`,
      { stdio: "pipe" },
    )
      .toString()
      .trim();
    running = output === containerName;
  } catch {
    running = false;
  }

  if (!running) {
    let exists = false;
    try {
      const output = execSync(
        `${docker} ps -a --filter "name=${containerName}" --format "{{.Names}}"`,
        { stdio: "pipe" },
      )
        .toString()
        .trim();
      exists = output === containerName;
    } catch {
      exists = false;
    }

    if (exists) {
      execSync(`${docker} start ${containerName}`, { stdio: "inherit" });
    } else {
      execSync(
        `${docker} run -d --name ${containerName} -p 5432:5432 -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password -e POSTGRES_DB=main_db -v notflix-pg-data:/var/lib/postgresql/data postgres:16-alpine`,
        { stdio: "inherit" },
      );
    }
  }

  await waitForPort(5432);
  execSync("npm run db:push --workspace=@notflix/database", {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

await ensureDb();
