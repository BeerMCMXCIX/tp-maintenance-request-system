import type { TicketStatus } from "../schemas/ticket.schema";
import type { UserRole } from "../schemas/auth.schema";

const permissions: Record<Exclude<UserRole, "ADMIN">, Readonly<Partial<Record<TicketStatus, readonly TicketStatus[]>>>> = {
  USER: {},
  IT: {
    PENDING: ["IN_REVIEW", "CANCELLED"],
    IN_REVIEW: ["AWAITING_APPROVAL", "COMPLETED", "CANCELLED"],
  },
  PROCUREMENT: {
    AWAITING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["PURCHASING", "CANCELLED"],
    PURCHASING: ["COMPLETED", "CANCELLED"],
  },
};

export function canRoleTransition(role: UserRole, from: TicketStatus, to: TicketStatus): boolean {
  if (role === "ADMIN") return true;
  return permissions[role][from]?.includes(to) ?? false;
}
