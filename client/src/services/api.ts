import type {
  CreateTicketInput,
  TicketQuery,
  TicketStatus,
} from "../domain/tickets";
import { parsePage, parseSession, parseTicket, parseUser, record } from "./parsers";

const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(API_URL + path, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบเครือข่ายแล้วลองใหม่", {
      cause: error,
    });
  }
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ApiError(
      "เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง กรุณาลองใหม่",
      response.status,
    );
  }
  const body = record(raw);
  if (!response.ok || body.success !== true) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "ไม่สามารถดำเนินการได้",
      response.status,
    );
  }
  return body;
}
export async function getTickets(query: TicketQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: "10",
    search: query.search,
    sortBy: query.sort === "title" ? "title" : "createdAt",
    order: query.sort === "newest" ? "desc" : "asc",
    ...(query.status ? { status: query.status } : {}),
  });
  return parsePage(await request("/tickets?" + params, { signal }));
}
export async function getTicket(id: number, signal?: AbortSignal) {
  return parseTicket((await request("/tickets/" + id, { signal })).data);
}
export async function createTicket(input: CreateTicketInput) {
  return parseTicket(
    (
      await request("/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    ).data,
  );
}
export async function updateTicketStatus(
  id: number,
  input: { status: TicketStatus; note: string; version: number },
  token: string,
) {
  return parseTicket(
    (
      await request("/tickets/" + id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(input),
      })
    ).data,
  );
}
export async function login(username: string, password: string) {
  return parseSession((await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })).data);
}
export async function logout(token: string) {
  await request("/auth/logout", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });
}
export async function getMe(token: string) {
  const body = await request("/auth/me", {
    headers: { Authorization: "Bearer " + token },
  });
  return parseUser(record(body.data).user);
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่";
