import type { TicketStatus } from "../schemas/ticket.schema";

// These transitions record the paper approval process; they are not digital signatures.
export const transitions: Record<TicketStatus, readonly TicketStatus[]> = {
  PENDING: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["AWAITING_APPROVAL", "COMPLETED", "CANCELLED"],
  AWAITING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PURCHASING", "CANCELLED"],
  PURCHASING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: TicketStatus): boolean {
  return Object.prototype.hasOwnProperty.call(transitions, from)
    && transitions[from as TicketStatus].includes(to);
}
