import type { Request, Response } from "express";
import {
  createTicketSchema,
  listTicketsSchema,
  ticketIdSchema,
  updateTicketSchema,
} from "../schemas/ticket.schema";
import * as tickets from "../services/ticket.service";

export async function createTicket(req: Request, res: Response): Promise<void> {
  res
    .status(201)
    .json({
      success: true,
      data: await tickets.create(createTicketSchema.parse(req.body)),
    });
}

export async function getTickets(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    ...(await tickets.list(listTicketsSchema.parse(req.query))),
  });
}

export async function getTicket(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await tickets.get(ticketIdSchema.parse(req.params.id)),
  });
}

export async function updateTicket(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: await tickets.update(
      ticketIdSchema.parse(req.params.id),
      updateTicketSchema.parse(req.body),
      req.authUser!,
    ),
  });
}
