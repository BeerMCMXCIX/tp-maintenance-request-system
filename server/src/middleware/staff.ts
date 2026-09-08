import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { HttpError } from "./errors";

export function staffGuard(accessKey: string): RequestHandler {
  return (req, _res, next) => {
    if (!accessKey)
      throw new HttpError(
        503,
        "ยังไม่ได้ตั้งค่ารหัสเจ้าหน้าที่ กรุณาติดต่อผู้ดูแลระบบ",
      );
    const supplied = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    const digest = (value: string) =>
      createHash("sha256").update(value).digest();
    if (!supplied || !timingSafeEqual(digest(supplied), digest(accessKey))) {
      throw new HttpError(401, "รหัสเจ้าหน้าที่ไม่ถูกต้อง");
    }
    next();
  };
}
