import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { changePasswordSchema, resetPasswordSchema, pageSchema, userIdSchema, updateUserSchema, permissionsSchema } from "../schemas/auth.schema";
import * as users from "../services/user.service";
export function createUserRouter() {
  const router = Router();
  router.use(["/users", "/auth/password", "/audit-logs"], requireAuth);
  router.get("/users", async (req, res) => {
    const query = pageSchema.parse(req.query);
    res.json({ success: true, data: await users.listUsers(req.authUser!, query.page, query.search) });
  });
  router.put("/users/:id", async (req, res) => {
    res.json({ success: true, data: await users.updateUser(req.authUser!, userIdSchema.parse(req.params.id), updateUserSchema.parse(req.body)) });
  });
  router.delete("/users/:id", async (req, res) => {
    await users.deleteUser(req.authUser!, userIdSchema.parse(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  });
  router.put("/users/:id/permissions", async (req, res) => {
    res.json({ success: true, data: await users.setPermissions(req.authUser!, userIdSchema.parse(req.params.id), permissionsSchema.parse(req.body).permissions) });
  });
  router.put("/users/:id/password", async (req, res) => {
    await users.resetPassword(req.authUser!, userIdSchema.parse(req.params.id), resetPasswordSchema.parse(req.body).password);
    res.json({ success: true, data: { changed: true } });
  });
  router.put("/auth/password", async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    await users.changePassword(req.authUser!, input.password, input.currentPassword);
    res.json({ success: true, data: { changed: true } });
  });
  router.get("/audit-logs", async (req, res) => {
    const query = pageSchema.parse(req.query);
    res.json({ success: true, data: await users.listLogs(req.authUser!, query.page, query.search) });
  });
  return router;
}
