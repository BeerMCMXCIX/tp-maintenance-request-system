import type { Request, Response } from "express";
import { createUserSchema, loginSchema } from "../schemas/auth.schema";
import * as auth from "../services/auth.service";
import * as users from "../services/user.service";
import { HttpError } from "../middleware/errors";
import { validBootstrapKey } from "../middleware/auth";
import {
  clearLoginFailures,
  recordLoginFailure,
} from "../middleware/login-rate-limit";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const session = await auth.login(loginSchema.parse(req.body));
    clearLoginFailures(res.locals.loginRateKey);
    res.json({ success: true, data: session });
  } catch (error) {
    if (error instanceof HttpError && error.status === 401)
      recordLoginFailure(res.locals.loginRateKey);
    throw error;
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: { user: req.authUser } });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await auth.logout(req.authTokenHash!, req.authUser!);
  res.json({ success: true, data: { loggedOut: true } });
}

export function createUser(bootstrapKey: string) {
  return async (req: Request, res: Response): Promise<void> => {
    const count = await auth.userCount();
    if (count === 0) {
      if (!validBootstrapKey(req.header("x-bootstrap-key"), bootstrapKey))
        throw new HttpError(401, "Bootstrap key ไม่ถูกต้อง");
      const input = createUserSchema.parse(req.body);
      if (input.role !== "ADMIN")
        throw new HttpError(400, "บัญชีแรกต้องเป็น role ADMIN");
      res
        .status(201)
        .json({ success: true, data: await auth.createFirstAdmin(input) });
      return;
    }
    if (!req.authUser)
      throw new HttpError(401, "กรุณา Login ด้วยบัญชีที่มีสิทธิ์จัดการผู้ใช้");
    if (!auth.hasPermission(req.authUser, "MANAGE_USERS"))
      throw new HttpError(403, "ต้องมีสิทธิ์จัดการผู้ใช้เพื่อสร้างบัญชี");
    res.status(201).json({
      success: true,
      data: await users.createUser(req.authUser, createUserSchema.parse(req.body)),
    });
  };
}
