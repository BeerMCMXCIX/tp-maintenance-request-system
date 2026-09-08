import "dotenv/config";
import dotenv from "dotenv";
import { z } from "zod";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";

dotenv.config({ path: ".env.local", quiet: true });

const env = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CLIENT_ORIGINS: z
      .string()
      .default("http://localhost:5173,http://127.0.0.1:5173"),
    USER_BOOTSTRAP_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(16).optional(),
    ),
  })
  .parse(process.env);

const app = createApp({
  clientOrigins: env.CLIENT_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  userBootstrapKey:
    env.USER_BOOTSTRAP_KEY ?? process.env.STAFF_ACCESS_KEY ?? "",
});

const server = app.listen(env.PORT, () => {
  console.info({ event: "server_started", port: env.PORT });
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(() => {
    void prisma.$disconnect().finally(() => {
      clearTimeout(timeout);
      process.exit(0);
    });
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
