import { Router } from "express";
import {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
} from "../controllers/ticket.controller";
import { requireAuth } from "../middleware/auth";

export function createTicketRouter() {
  const router = Router();
  router.post("/", createTicket);
  router.get("/", getTickets);
  router.get("/:id", getTicket);
  router.put("/:id", requireAuth, updateTicket);
  // Keep the document and its history. Cancellation replaces permanent deletion.
  return router;
}
