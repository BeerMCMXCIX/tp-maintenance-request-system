import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errors";
import { audit } from "./audit.service";
import { hashPassword, verifyPassword, publicUser, hasPermission, type AuthUser } from "./auth.service";
import type { CreateUserInput, UpdateUserInput, Permission } from "../schemas/auth.schema";

export function assertPermission(user: AuthUser, permission: Permission) {
  if (!hasPermission(user, permission)) throw new HttpError(403, "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ");
}
async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  try {
    return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw new HttpError(409, "รหัส User นี้มีผู้ใช้งานแล้ว");
      if (error.code === "P2034") throw new HttpError(409, "ข้อมูลมีการเปลี่ยนแปลงพร้อมกัน กรุณาลองใหม่");
    }
    throw error;
  }
}
async function currentActor(tx: Prisma.TransactionClient, user: AuthUser) {
  const record = await tx.user.findUnique({ where: { id: user.id } });
  if (!record?.active || record.deletedAt) throw new HttpError(401, "บัญชีถูกปิดใช้งาน");
  return publicUser(record);
}
async function managedTarget(tx: Prisma.TransactionClient, actor: AuthUser, id: number, permission: Permission) {
  const current = await currentActor(tx, actor);
  assertPermission(current, permission);
  const target = await tx.user.findUnique({ where: { id } });
  if (!target || target.deletedAt) throw new HttpError(404, "ไม่พบผู้ใช้");
  if (current.role !== "ADMIN" && (target.role === "ADMIN" ||
      publicUser(target).permissions.some(value => !current.permissions.includes(value))))
    throw new HttpError(403, "ไม่สามารถจัดการบัญชีที่มีสิทธิ์สูงกว่าตนเอง");
  return { current, target };
}
export async function listUsers(actor: AuthUser, page: number, search: string) {
  if (!hasPermission(actor, "MANAGE_USERS") && !hasPermission(actor, "MANAGE_PERMISSIONS"))
    throw new HttpError(403, "ไม่มีสิทธิ์ดูผู้ใช้");
  const where: Prisma.UserWhereInput = { deletedAt: null, ...(search ? { OR:
    ["username", "displayName", "department", "branch"].map(field => ({ [field]: { contains: search } })) } : {}) };
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip: (page - 1) * 20, take: 20, orderBy: { id: "desc" } }),
  ]);
  return { users: users.map(publicUser), total, page };
}
export async function createUser(actor: AuthUser, input: CreateUserInput) {
  const { password, ...data } = input;
  const passwordHash = await hashPassword(password);
  return transaction(async tx => {
    const current = await currentActor(tx, actor);
    assertPermission(current, "MANAGE_USERS");
    if (input.role === "ADMIN" && current.role !== "ADMIN") throw new HttpError(403, "เฉพาะ ADMIN สร้าง ADMIN ได้");
    const user = await tx.user.create({ data: { ...data, passwordHash } });
    await audit("USER_CREATED", current, String(user.id), JSON.stringify(publicUser(user)), tx);
    return publicUser(user);
  });
}
export async function updateUser(actor: AuthUser, id: number, input: UpdateUserInput) {
  return transaction(async tx => {
    const { current, target } = await managedTarget(tx, actor, id, "MANAGE_USERS");
    if (input.role !== target.role && current.role !== "ADMIN" && !hasPermission(current, "MANAGE_PERMISSIONS"))
      throw new HttpError(403, "ต้องมีสิทธิ์จัดการสิทธิ์เพื่อเปลี่ยนบทบาท");
    if (input.role === "ADMIN" && current.role !== "ADMIN") throw new HttpError(403, "เฉพาะ ADMIN กำหนด ADMIN ได้");
    if (id === current.id && (!input.active || input.role !== target.role))
      throw new HttpError(400, "ไม่สามารถปิดบัญชีหรือลดบทบาทตนเอง");
    await protectLastAdmin(tx, target, input.active && input.role === "ADMIN");
    const user = await tx.user.update({ where: { id }, data: input });
    await tx.authSession.deleteMany({ where: { userId: id } });
    await audit("USER_UPDATED", current, String(id), JSON.stringify({ before: publicUser(target), after: publicUser(user) }), tx);
    return publicUser(user);
  });
}
async function protectLastAdmin(tx: Prisma.TransactionClient, target: { role: string; active: boolean }, remainsAdmin: boolean) {
  if (target.role === "ADMIN" && target.active && !remainsAdmin &&
      await tx.user.count({ where: { role: "ADMIN", active: true, deletedAt: null } }) <= 1)
    throw new HttpError(409, "ต้องมี ADMIN ที่ใช้งานได้อย่างน้อยหนึ่งบัญชี");
}
export async function deleteUser(actor: AuthUser, id: number) {
  return transaction(async tx => {
    const { current, target } = await managedTarget(tx, actor, id, "MANAGE_USERS");
    if (id === current.id) throw new HttpError(400, "ไม่สามารถลบบัญชีตนเอง");
    await protectLastAdmin(tx, target, false);
    await tx.user.update({ where: { id }, data: { active: false, deletedAt: new Date() } });
    await tx.authSession.deleteMany({ where: { userId: id } });
    await audit("USER_DELETED", current, String(id), JSON.stringify(publicUser(target)), tx);
  });
}
export async function setPermissions(actor: AuthUser, id: number, permissions: Permission[]) {
  return transaction(async tx => {
    const { current, target } = await managedTarget(tx, actor, id, "MANAGE_PERMISSIONS");
    if (target.role === "ADMIN") throw new HttpError(400, "ADMIN มีสิทธิ์ทั้งหมดอยู่แล้ว");
    if (id === current.id) throw new HttpError(400, "ให้ผู้จัดการสิทธิ์อีกคนแก้สิทธิ์ของคุณ");
    if (current.role !== "ADMIN" && permissions.some(value => !current.permissions.includes(value)))
      throw new HttpError(403, "ไม่สามารถมอบสิทธิ์ที่ตนเองไม่มี");
    const user = await tx.user.update({ where: { id }, data: { permissions } });
    await tx.authSession.deleteMany({ where: { userId: id } });
    await audit("PERMISSIONS_UPDATED", current, String(id), JSON.stringify({ before: publicUser(target).permissions, after: permissions }), tx);
    return publicUser(user);
  });
}
export async function changePassword(actor: AuthUser, password: string, currentPassword: string) {
  const passwordHash = await hashPassword(password);
  return transaction(async tx => {
    const current = await currentActor(tx, actor);
    const user = await tx.user.findUniqueOrThrow({ where: { id: current.id } });
    if (!await verifyPassword(currentPassword, user.passwordHash)) throw new HttpError(400, "Password ปัจจุบันไม่ถูกต้อง");
    await tx.user.update({ where: { id: current.id }, data: { passwordHash } });
    await tx.authSession.deleteMany({ where: { userId: current.id } });
    await audit("PASSWORD_CHANGED", current, String(current.id), undefined, tx);
  });
}
export async function resetPassword(actor: AuthUser, id: number, password: string) {
  const passwordHash = await hashPassword(password);
  return transaction(async tx => {
    const { current } = await managedTarget(tx, actor, id, "MANAGE_USERS");
    await tx.user.update({ where: { id }, data: { passwordHash } });
    await tx.authSession.deleteMany({ where: { userId: id } });
    await audit("PASSWORD_RESET", current, String(id), undefined, tx);
  });
}
export async function listLogs(actor: AuthUser, page: number, search: string) {
  assertPermission(actor, "VIEW_LOGS");
  const where: Prisma.AuditLogWhereInput = search ? { OR:
    ["action", "actorUsername", "target"].map(field => ({ [field]: { contains: search } })) } : {};
  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, skip: (page - 1) * 30, take: 30, orderBy: { id: "desc" } }),
  ]);
  return { logs, total, page };
}
