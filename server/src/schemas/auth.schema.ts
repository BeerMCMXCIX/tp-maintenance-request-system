import { z } from "zod";

export const roles = ["ADMIN", "IT", "PROCUREMENT"] as const;
export type UserRole = (typeof roles)[number];

const username = z
  .string()
  .trim()
  .min(3, "Username ต้องมีอย่างน้อย 3 ตัวอักษร")
  .max(50, "Username ต้องไม่เกิน 50 ตัวอักษร")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username ใช้ได้เฉพาะ a-z, A-Z, 0-9, จุด, ขีดกลาง และขีดล่าง",
  )
  .transform((value) => value.toLowerCase());

export const loginSchema = z
  .object({
    username,
    password: z.string().min(1, "กรุณาระบุ Password").max(128),
  })
  .strict();

export const createUserSchema = z
  .object({
    username,
    password: z
      .string()
      .min(8, "Password ต้องมีอย่างน้อย 8 ตัวอักษร")
      .max(128, "Password ต้องไม่เกิน 128 ตัวอักษร"),
    displayName: z.string().trim().min(1, "กรุณาระบุชื่อผู้ใช้งาน").max(100),
    role: z.enum(roles),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
