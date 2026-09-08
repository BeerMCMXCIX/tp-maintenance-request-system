import type { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { authenticate } from "../services/auth.service";
import { HttpError } from "./errors";
import type { UserRole } from "../schemas/auth.schema";

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header ?? "");
  return match?.[1] ?? null;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = bearerToken(req.headers.authorization);
    if (!token) throw new HttpError(401, "กรุณา Login ก่อนใช้งาน");
    const auth = await authenticate(token);
    req.authUser = auth.user;
    req.authTokenHash = auth.tokenHash;
    next();
  } catch (error) { next(error); }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      throw new HttpError(403, "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ");
    }
    next();
  };
}

export function validBootstrapKey(supplied: string | undefined, configured: string): boolean {
  if (!supplied || !configured) return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(configured);
  return left.length === right.length && timingSafeEqual(left, right);
}
