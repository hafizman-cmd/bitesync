import { NextRequest, NextResponse } from "next/server";
import { RoomError } from "@/lib/errors";
import { cookieName, readBody, readName, routeError, setRoomCookie, validateCode } from "@/lib/http";
import { getRoom, updateRoom, type RoomAction } from "@/lib/rooms";
import { VOTES, type Vote } from "@/lib/types";

type Context = { params: Promise<{ code: string }> };

function readAction(body: Record<string, unknown>): RoomAction {
  if (body.action === "join") return { action: "join", name: readName(body.name) };
  if (body.action === "start") return { action: "start" };
  if (body.action === "vote" && typeof body.placeId === "string" && VOTES.includes(body.vote as Vote)) {
    return { action: "vote", placeId: body.placeId, vote: body.vote as Vote };
  }
  throw new RoomError("invalidAction");
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { code } = await params;
    validateCode(code);
    const room = await getRoom(code, request.cookies.get(cookieName(code))?.value);
    return NextResponse.json(room, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { code } = await params;
    validateCode(code);
    const action = readAction(await readBody(request));
    const { room, token } = await updateRoom(code, action, request.cookies.get(cookieName(code))?.value);
    const response = NextResponse.json(room, { headers: { "Cache-Control": "private, no-store" } });
    if (token) setRoomCookie(response, code, token, request);
    return response;
  } catch (error) {
    return routeError(error);
  }
}
