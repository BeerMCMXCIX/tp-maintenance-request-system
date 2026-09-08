import express from "express";
import cors from "cors";
import { createTicketRouter } from "./routes/ticket.route";
import { errorHandler } from "./middleware/errors";
import { staffGuard } from "./middleware/staff";

export interface AppConfig {
  clientOrigins: string[];
  staffAccessKey: string;
}

export function createApp(config: AppConfig) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: "64kb" }));
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });
  app.post(
    "/api/staff/verify",
    staffGuard(config.staffAccessKey),
    (_req, res) => {
      res.json({ success: true, data: { verified: true } });
    },
  );
  app.use("/api/tickets", createTicketRouter(config.staffAccessKey));
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: "ไม่พบ API ที่ร้องขอ" });
  });
  app.use(errorHandler);
  return app;
}
