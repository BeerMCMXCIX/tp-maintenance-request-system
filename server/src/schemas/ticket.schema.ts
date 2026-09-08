import { z } from "zod";

export const statuses = ["PENDING", "IN_REVIEW", "AWAITING_APPROVAL", "APPROVED", "PURCHASING", "COMPLETED", "REJECTED", "CANCELLED"] as const;
export type TicketStatus = (typeof statuses)[number];
const text = (max: number) => z.string().trim().min(1, "กรุณากรอกข้อมูลให้ครบถ้วน").max(max);
const optionalText = (max: number) => z.string().trim().max(max).default("");

export const createTicketSchema = z.object({
  title: text(100),
  description: text(3000),
  requesterName: text(100),
  department: text(100),
  contact: text(100),
  location: text(150),
  assetCode: optionalText(100),
  priority: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
  items: z.array(z.object({
    name: text(200),
    quantity: z.number().int().min(1).max(9999),
    unit: text(30),
    estimatedUnitPrice: z.number().min(0).max(9999999).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "ระบุราคาไม่เกิน 2 ตำแหน่งทศนิยม").nullable(),
  }).strict()).max(20).default([]),
}).strict();

export const ticketIdSchema = z.coerce.number().int().positive().max(2147483647);
export const listTicketsSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).default(""),
  status: z.enum(statuses).optional(),
  sortBy: z.enum(["createdAt", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export const updateTicketSchema = z.object({
  status: z.enum(statuses),
  note: text(2000),
  version: z.number().int().min(0),
}).strict();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ListTicketsInput = z.infer<typeof listTicketsSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
