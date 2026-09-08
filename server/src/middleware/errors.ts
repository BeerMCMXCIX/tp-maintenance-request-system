import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof ZodError) {
    res
      .status(400)
      .json({
        success: false,
        error: error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
      });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    res.status(404).json({ success: false, error: "ไม่พบรายการแจ้งซ่อม" });
    return;
  }
  if (typeof error === "object" && error !== null && "type" in error) {
    if (
      error.type === "entity.parse.failed" ||
      error.type === "entity.too.large"
    ) {
      res
        .status(error.type === "entity.too.large" ? 413 : 400)
        .json({
          success: false,
          error: "รูปแบบข้อมูลไม่ถูกต้องหรือข้อมูลมีขนาดใหญ่เกินไป",
        });
      return;
    }
  }
  console.error({
    event: "request_failed",
    name: error instanceof Error ? error.name : "UnknownError",
  });
  res
    .status(500)
    .json({
      success: false,
      error: "ระบบไม่สามารถดำเนินการได้ กรุณาลองใหม่หรือติดต่อ IT",
    });
};
