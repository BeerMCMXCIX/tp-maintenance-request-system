import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errors";
import { canTransition, transitions } from "../domain/workflow";
import { statuses, type CreateTicketInput, type ListTicketsInput, type TicketStatus, type UpdateTicketInput } from "../schemas/ticket.schema";

const include = { items: { orderBy: { id: "asc" as const } }, history: { orderBy: { id: "asc" as const } } };
type TicketRecord = Prisma.RepairTicketGetPayload<{ include: typeof include }>;

function serialize(ticket: TicketRecord) {
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Bangkok" }).format(ticket.createdAt);
  return {
    ...ticket,
    documentNumber: `TP-IT-${year}-${String(ticket.id).padStart(6, "0")}`,
    items: ticket.items.map(item => ({ ...item, estimatedUnitPrice: item.estimatedUnitPrice?.toNumber() ?? null })),
    allowedTransitions: Object.prototype.hasOwnProperty.call(transitions, ticket.status) ? transitions[ticket.status as TicketStatus] : [],
  };
}

export async function create(input: CreateTicketInput) {
  const { items, ...data } = input;
  const ticket = await prisma.repairTicket.create({
    data: { ...data, items: { create: items }, history: { create: { status: "PENDING", actor: data.requesterName, note: "สร้างคำขอแจ้งซ่อม / ขออุปกรณ์ IT" } } },
    include,
  });
  return serialize(ticket);
}

export async function get(id: number) {
  const ticket = await prisma.repairTicket.findUnique({ where: { id }, include });
  if (!ticket) throw new HttpError(404, "ไม่พบรายการแจ้งซ่อม");
  return serialize(ticket);
}

export async function list(query: ListTicketsInput) {
  const search = query.search;
  const documentId = /^TP-IT-\d{4}-(\d+)$/i.exec(search)?.[1];
  const id = Number(documentId ?? search);
  const where: Prisma.RepairTicketWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(search ? { OR: [
      ...["title", "description", "requesterName", "department", "assetCode"].map(field => ({ [field]: { contains: search } })),
      ...(Number.isInteger(id) && id > 0 && id <= 2147483647 ? [{ id }] : []),
    ] } : {}),
  };
  return prisma.$transaction(async tx => {
    const total = await tx.repairTicket.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    const page = Math.min(query.page, totalPages);
    const tickets = await tx.repairTicket.findMany({
      where, skip: (page - 1) * query.limit, take: query.limit,
      orderBy: [{ [query.sortBy]: query.order }, { id: query.order }], include,
    });
    const groups = await tx.repairTicket.groupBy({ by: ["status"], _count: { _all: true } });
    const counts = Object.fromEntries(statuses.map(status => [status, groups.find(group => group.status === status)?._count._all ?? 0]));
    return {
      data: tickets.map(serialize), pagination: { total, page, limit: query.limit, totalPages },
      stats: { total: groups.reduce((sum, group) => sum + group._count._all, 0), counts },
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function update(id: number, input: UpdateTicketInput) {
  return prisma.$transaction(async tx => {
    const ticket = await tx.repairTicket.findUnique({ where: { id }, include });
    if (!ticket) throw new HttpError(404, "ไม่พบรายการแจ้งซ่อม");
    if (ticket.version !== input.version) throw new HttpError(409, "รายการถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก");
    if (!canTransition(ticket.status, input.status)) throw new HttpError(409, "ไม่สามารถเปลี่ยนสถานะตามลำดับนี้ได้");
    if (input.status === "AWAITING_APPROVAL" && ticket.items.length === 0) {
      throw new HttpError(400, "คำขอนี้ไม่มีรายการอุปกรณ์สำหรับขอจัดซื้อ");
    }
    const changed = await tx.repairTicket.updateMany({
      where: { id, version: input.version }, data: { status: input.status, version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new HttpError(409, "รายการถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก");
    await tx.ticketEvent.create({ data: { ticketId: id, status: input.status, actor: input.actor, note: input.note } });
    return serialize(await tx.repairTicket.findUniqueOrThrow({ where: { id }, include }));
  });
}
