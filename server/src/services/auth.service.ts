import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errors";
import type {
  CreateUserInput,
  LoginInput,
  UserRole,
} from "../schemas/auth.schema";

const scrypt = promisify(scryptCallback);
const SESSION_HOURS = 8;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !expectedHex ||
    !/^[a-f0-9]{128}$/i.test(expectedHex)
  )
    return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function publicUser(user: {
  id: number;
  username: string;
  displayName: string;
  role: string;
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserRole,
  };
}

export async function createUser(input: CreateUserInput) {
  const { password, ...userData } = input;
  try {
    const user = await prisma.user.create({
      data: { ...userData, passwordHash: await hashPassword(password) },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    return user;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "Username นี้มีผู้ใช้งานแล้ว");
    }
    throw error;
  }
}

export async function createFirstAdmin(input: CreateUserInput) {
  const { password, ...userData } = input;
  const passwordHash = await hashPassword(password);
  try {
    return await prisma.$transaction(async tx => {
      if (await tx.user.count() !== 0) throw new HttpError(409, "มีบัญชีในระบบแล้ว กรุณาใช้ ADMIN token สร้าง User");
      return tx.user.create({
        data: { ...userData, passwordHash },
        select: { id: true, username: true, displayName: true, role: true, active: true, createdAt: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new HttpError(409, "มีการสร้างบัญชีแรกแล้ว กรุณา Login ด้วย ADMIN");
    }
    throw error;
  }
}

export async function userCount(): Promise<number> {
  return prisma.user.count();
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
  });
  if (
    !user ||
    !user.active ||
    !(await verifyPassword(input.password, user.passwordHash))
  ) {
    throw new HttpError(401, "Username หรือ Password ไม่ถูกต้อง");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.authSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    }),
    prisma.authSession.create({
      data: { tokenHash: tokenHash(token), userId: user.id, expiresAt },
    }),
  ]);
  return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) };
}

export async function authenticate(token: string) {
  const hash = tokenHash(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active) {
    if (session) await prisma.authSession.delete({ where: { id: session.id } });
    throw new HttpError(401, "Session หมดอายุหรือไม่ถูกต้อง กรุณา Login ใหม่");
  }
  return { user: publicUser(session.user), tokenHash: hash };
}

export async function logout(hash: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { tokenHash: hash } });
}
