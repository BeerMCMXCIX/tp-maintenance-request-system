export const statusLabels = {
  PENDING: "รับคำขอแล้ว",
  IN_REVIEW: "IT กำลังตรวจสอบ",
  AWAITING_APPROVAL: "รอจัดซื้ออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  PURCHASING: "กำลังจัดซื้อ",
  COMPLETED: "ดำเนินการเสร็จสิ้น",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
} as const;
export type TicketStatus = keyof typeof statusLabels;
export const roleLabels = {
  ADMIN: "ผู้ดูแลระบบ",
  IT: "เจ้าหน้าที่ IT",
  PROCUREMENT: "เจ้าหน้าที่จัดซื้อ",
} as const;
export type UserRole = keyof typeof roleLabels;
export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
}
export interface AuthSession {
  token: string;
  expiresAt: string;
  user: AuthUser;
}
export interface RequestItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number | null;
}
export interface TicketEvent {
  id: number;
  status: TicketStatus;
  actor: string;
  note: string;
  createdAt: string;
}
export interface CreateTicketInput {
  title: string;
  description: string;
  requesterName: string;
  department: string;
  contact: string;
  location: string;
  assetCode: string;
  priority: "NORMAL" | "URGENT";
  items: RequestItem[];
}
export interface Ticket extends CreateTicketInput {
  id: number;
  documentNumber: string;
  status: TicketStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  history: TicketEvent[];
  allowedTransitions: TicketStatus[];
}
export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface TicketStats {
  total: number;
  counts: Record<TicketStatus, number>;
}
export interface TicketQuery {
  page: number;
  search: string;
  status: TicketStatus | "";
  sort: "newest" | "oldest" | "title";
}
export interface TicketPage {
  data: Ticket[];
  pagination: PaginationData;
  stats: TicketStats;
}
export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && Object.hasOwn(statusLabels, value);
}
export const money = (amount: number) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
export const dateTime = (date: string) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(date));
export function estimatedTotal(items: RequestItem[]) {
  return (
    items.reduce(
      (sum, item) =>
        sum + Math.round((item.estimatedUnitPrice ?? 0) * 100) * item.quantity,
      0,
    ) / 100
  );
}

const roleTransitions: Record<
  Exclude<UserRole, "ADMIN">,
  Readonly<Partial<Record<TicketStatus, readonly TicketStatus[]>>>
> = {
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

export function canRoleTransition(
  role: UserRole,
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  return role === "ADMIN" || (roleTransitions[role][from]?.includes(to) ?? false);
}
