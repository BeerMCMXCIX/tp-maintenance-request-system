import { Router } from "express";
import { createUser, login, logout, me } from "../controllers/auth.controller";
import { loginRateLimit } from "../middleware/login-rate-limit";
import { requireAuth } from "../middleware/auth";

export function createAuthRouter(bootstrapKey: string) {
  const router = Router();
  router.post("/auth/login", loginRateLimit, login);
  router.get("/auth/me", requireAuth, me);
  router.post("/auth/logout", requireAuth, logout);
  router.post(
    "/users",
    async (req, res, next) => {
      try {
        if (req.headers.authorization) {
          await new Promise<void>((resolve, reject) =>
            requireAuth(req, res, (error) =>
              error ? reject(error) : resolve(),
            ),
          );
        }
        next();
      } catch (error) {
        next(error);
      }
    },
    createUser(bootstrapKey),
  );
  return router;
}
