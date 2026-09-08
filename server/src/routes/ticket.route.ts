import { Router } from "express";
import {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
} from "../controllers/ticket.controller";
import { staffGuard } from "../middleware/staff";

export function createTicketRouter(accessKey: string) {
  const router = Router();
  router.post("/", createTicket);
  router.get("/", getTickets);
  router.get("/:id", getTicket);
  router.put("/:id", staffGuard(accessKey), updateTicket);
  // Keep the document and its history. Cancellation replaces permanent deletion.
  return router;
}
