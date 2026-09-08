import type { RequestHandler } from "express";
import { HttpError } from "./errors";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; resetAt: number }>();

export const loginRateLimit: RequestHandler = (req, res, next) => {
  const username = typeof req.body?.username === "string" ? req.body.username.toLowerCase() : "";
  const key = `${req.ip}:${username}`;
  const current = failures.get(key);
  if (current && current.resetAt > Date.now() && current.count >= MAX_FAILURES) {
    throw new HttpError(429, "Login ผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่");
  }
  if (current && current.resetAt <= Date.now()) failures.delete(key);
  res.locals.loginRateKey = key;
  next();
};

export function recordLoginFailure(key: unknown): void {
  if (typeof key !== "string") return;
  const current = failures.get(key);
  failures.set(key, current && current.resetAt > Date.now()
    ? { ...current, count: current.count + 1 }
    : { count: 1, resetAt: Date.now() + WINDOW_MS });
}

export function clearLoginFailures(key: unknown): void {
  if (typeof key === "string") failures.delete(key);
}
