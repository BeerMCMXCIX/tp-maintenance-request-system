import type { UserRole } from "../schemas/auth.schema";

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: number; username: string; displayName: string; role: UserRole };
      authTokenHash?: string;
    }
  }
}

export {};
