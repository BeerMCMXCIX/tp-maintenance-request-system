import {
  isTicketStatus,
  statusLabels,
  type Ticket,
  type TicketPage,
  type RequestItem,
  type TicketEvent,
  type TicketStatus,
} from "../domain/tickets";

function invalid(): never {
  throw new Error("ข้อมูลที่ได้รับจากระบบไม่ถูกต้อง กรุณาติดต่อ IT");
}
export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return invalid();
  return value as Record<string, unknown>;
}
const string = (value: unknown): string =>
  typeof value === "string" ? value : invalid();
const number = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : invalid();
const integer = (value: unknown): number =>
  Number.isSafeInteger(number(value)) ? number(value) : invalid();
const date = (value: unknown): string =>
  Number.isFinite(Date.parse(string(value))) ? string(value) : invalid();
const status = (value: unknown): TicketStatus =>
  isTicketStatus(value) ? value : invalid();
function array<T>(value: unknown, parse: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(parse) : invalid();
}
function parseItem(value: unknown): RequestItem {
  const item = record(value);
  return {
    name: string(item.name),
    quantity: integer(item.quantity),
    unit: string(item.unit),
    estimatedUnitPrice:
      item.estimatedUnitPrice === null ? null : number(item.estimatedUnitPrice),
  };
}
function parseEvent(value: unknown): TicketEvent {
  const event = record(value);
  return {
    id: integer(event.id),
    status: status(event.status),
    actor: string(event.actor),
    note: string(event.note),
    createdAt: date(event.createdAt),
  };
}
export function parseTicket(value: unknown): Ticket {
  const ticket = record(value);
  if (ticket.priority !== "NORMAL" && ticket.priority !== "URGENT")
    return invalid();
  return {
    id: integer(ticket.id),
    version: integer(ticket.version),
    documentNumber: string(ticket.documentNumber),
    title: string(ticket.title),
    description: string(ticket.description),
    requesterName: string(ticket.requesterName),
    department: string(ticket.department),
    contact: string(ticket.contact),
    location: string(ticket.location),
    assetCode: string(ticket.assetCode),
    priority: ticket.priority,
    status: status(ticket.status),
    createdAt: date(ticket.createdAt),
    updatedAt: date(ticket.updatedAt),
    items: array(ticket.items, parseItem),
    history: array(ticket.history, parseEvent),
    allowedTransitions: array(ticket.allowedTransitions, status),
  };
}
export function parsePage(value: unknown): TicketPage {
  const page = record(value),
    pagination = record(page.pagination),
    stats = record(page.stats),
    counts = record(stats.counts);
  const validCounts = {} as Record<TicketStatus, number>;
  for (const key of Object.keys(statusLabels))
    if (isTicketStatus(key)) validCounts[key] = integer(counts[key]);
  return {
    data: array(page.data, parseTicket),
    pagination: {
      total: integer(pagination.total),
      page: integer(pagination.page),
      limit: integer(pagination.limit),
      totalPages: integer(pagination.totalPages),
    },
    stats: { total: integer(stats.total), counts: validCounts },
  };
}
