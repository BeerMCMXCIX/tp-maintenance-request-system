import { z } from "zod";

export const roles = ["ADMIN", "IT", "PROCUREMENT", "USER"] as const;
export type UserRole = (typeof roles)[number];
export const permissionNames = ["MANAGE_USERS", "MANAGE_PERMISSIONS", "VIEW_LOGS"] as const;
export type Permission = (typeof permissionNames)[number];
const username = z.string().trim().min(3).max(50)
  .regex(/^[a-zA-Z0-9._-]+$/, "รหัส User ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง และขีดล่าง")
  .transform(value => value.toLowerCase());
export const password = z.string().min(8, "Password ต้องมีอย่างน้อย 8 ตัวอักษร").max(128);
export const profileSchema = z.object({
  username,
  displayName: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1, "กรุณาระบุแผนก").max(100),
  branch: z.string().trim().min(1, "กรุณาระบุสาขา").max(100),
  role: z.enum(roles),
}).strict();
export const createUserSchema = profileSchema.extend({ password });
export const updateUserSchema = profileSchema.extend({ active: z.boolean() });
export const permissionsSchema = z.object({
  permissions: z.array(z.enum(permissionNames)).max(permissionNames.length).transform(value => [...new Set(value)]),
}).strict();
export const loginSchema = z.object({ username, password: z.string().min(1).max(128) }).strict();
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), password }).strict();
export const resetPasswordSchema = z.object({ password }).strict();
export const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), search: z.string().trim().max(100).default("") }).strict();
export const userIdSchema = z.coerce.number().int().positive().max(2147483647);
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
