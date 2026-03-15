import pino from "pino";
import path from "path";
import { CONFIG } from "$lib/server/infrastructure/config";

// This prints JSON to the server console
export const logger = pino({
  level: "info",
  redact: {
    paths: [
      "password",
      "token",
      "access_token",
      "refresh_token",
      "session.token",
      "user.email",
    ],
    remove: true,
  },
  transport: {
    targets: [
      {
        target: "pino/file",
        options: { destination: 1 }, // stdout for Docker/Console
      },
      {
        target: "pino/file",
        options: {
          destination: path.join(CONFIG.LOGS_DIR, "platform.log"),
          mkdir: true,
        },
      },
    ],
  },
});
