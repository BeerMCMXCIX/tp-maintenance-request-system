import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errors";
import { permissionNames, type CreateUserInput, type LoginInput, type Permission, type UserRole } from "../schemas/auth.schema";
import { audit } from "./audit.service";

const scrypt = promisify(scryptCallback);
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return "scrypt$" + salt + "$" + hash.toString("hex");
}
export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expectedHex, "hex"));
}
export function publicUser(user: User) {
  const permissions: Permission[] = user.role === "ADMIN" ? [...permissionNames]
    : permissionNames.filter(permission => Array.isArray(user.permissions) && user.permissions.includes(permission));
  return {
    id: user.id, username: user.username, displayName: user.displayName,
    role: user.role as UserRole, department: user.department, branch: user.branch,
    active: user.active, permissions,
  };
}
export type AuthUser = ReturnType<typeof publicUser>;
export const hasPermission = (user: AuthUser, permission: Permission) =>
  user.role === "ADMIN" || user.permissions.includes(permission);
export async function createFirstAdmin(input: CreateUserInput) {
  const { password, ...data } = input;
  const passwordHash = await hashPassword(password);
  try {
    return await prisma.$transaction(async tx => {
      if (await tx.user.count() !== 0) throw new HttpError(409, "มีบัญชีในระบบแล้ว กรุณา Login");
      const user = await tx.user.create({ data: { ...data, passwordHash } });
      await audit("USER_BOOTSTRAP", publicUser(user), String(user.id), undefined, tx);
      return publicUser(user);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code))
      throw new HttpError(409, "มีการสร้างบัญชีแล้ว กรุณา Login");
    throw error;
  }
}
export const userCount = () => prisma.user.count();
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user || !user.active || user.deletedAt || !await verifyPassword(input.password, user.passwordHash)) {
    await audit("LOGIN_FAILED", undefined, input.username);
    throw new HttpError(401, "รหัส User หรือ Password ไม่ถูกต้อง");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  // Recheck the credentials inside the transaction in case a password was reset concurrently.
  await prisma.$transaction(async tx => {
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current?.active || current.deletedAt || current.passwordHash !== user.passwordHash)
      throw new HttpError(401, "บัญชีมีการเปลี่ยนแปลง กรุณา Login ใหม่");
    await tx.authSession.create({ data: { tokenHash: tokenHash(token), userId: user.id, expiresAt } });
    await audit("LOGIN", publicUser(user), String(user.id), undefined, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) };
}
export async function authenticate(token: string) {
  const hash = tokenHash(token);
  const session = await prisma.authSession.findUnique({ where: { tokenHash: hash }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || !session.user.active || session.user.deletedAt) {
    if (session) await prisma.authSession.deleteMany({ where: { id: session.id } });
    throw new HttpError(401, "Session หมดอายุหรือไม่ถูกต้อง กรุณา Login ใหม่");
  }
  return { user: publicUser(session.user), tokenHash: hash };
}
export async function logout(hash: string, user: AuthUser) {
  await prisma.$transaction(async tx => {
    await tx.authSession.deleteMany({ where: { tokenHash: hash } });
    await audit("LOGOUT", user, String(user.id), undefined, tx);
  });
}
