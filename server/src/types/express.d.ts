import type { AuthUser } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      authTokenHash?: string;
    }
  }
}

export {};
