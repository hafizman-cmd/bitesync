import { NextResponse } from "next/server";
import { errors, RoomError } from "./errors";

export function routeError(error: unknown) {
  if (error instanceof RoomError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error("Make Mano request failed", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: errors.serverError.en, code: "serverError" }, { status: 500 });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new RoomError("jsonRequired", 415);
  }
  try {
    const text = await request.text();
    if (text.length > 4096) throw new RoomError("bodyTooLarge", 413);
    const data: unknown = JSON.parse(text);
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RoomError) throw error;
  }
  throw new RoomError("invalidRequest");
}

export function readName(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 32) {
    throw new RoomError("invalidName");
  }
  return value.trim();
}

export function cookieName(code: string) {
  return `bitesync_${code}`;
}

export function setRoomCookie(response: NextResponse, code: string, token: string, request: Request) {
  response.cookies.set(cookieName(code), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: `/api/rooms/${code}`,
    maxAge: 86400,
  });
}

export function validateCode(code: string) {
  if (!/^[A-Za-z0-9_-]{12}$/.test(code)) throw new RoomError("invalidLink", 404);
}
