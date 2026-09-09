import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
export interface AuditActor { id: number; username: string }
export function audit(action: string, actor?: AuditActor, target?: string, details?: string, db: Prisma.TransactionClient = prisma) {
  // Never include request bodies, passwords, session tokens or password hashes.
  return db.auditLog.create({ data: {
    action, actorId: actor?.id ?? null, actorUsername: actor?.username ?? "",
    target: target ?? "", details: details ?? "",
  } });
}
