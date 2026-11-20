import { NextResponse } from "next/server";
import { RoomError } from "./errors";

export function routeError(error: unknown) {
  if (error instanceof RoomError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("BiteSync request failed", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: "Something went wrong. Try again in a moment." }, { status: 500 });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new RoomError("Send an application/json request.", 415);
  }
  try {
    const text = await request.text();
    if (text.length > 4096) throw new RoomError("Request is too large.", 413);
    const data: unknown = JSON.parse(text);
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RoomError) throw error;
  }
  throw new RoomError("The request is invalid.");
}

export function readName(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 32) {
    throw new RoomError("Enter a name with 1 to 32 characters.");
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
  if (!/^[A-Za-z0-9_-]{12}$/.test(code)) throw new RoomError("This room link is invalid.", 404);
}
