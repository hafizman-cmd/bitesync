import { NextResponse } from "next/server";
import { RoomError } from "@/lib/errors";
import { readBody, readName, routeError, setRoomCookie } from "@/lib/http";
import { findPlaces } from "@/lib/places";
import { createRoom } from "@/lib/rooms";
import { SAMPLE_AREA, SAMPLE_PLACES, type Area } from "@/lib/types";

function readArea(value: unknown): Area {
  if (!value || typeof value !== "object") throw new RoomError("Choose an area first.");
  const { lat, lon, label } = value as Partial<Area>;
  if (typeof lat !== "number" || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      typeof lon !== "number" || !Number.isFinite(lon) || Math.abs(lon) > 180 ||
      typeof label !== "string" || !label.trim() || label.length > 250) {
    throw new RoomError("Choose a valid area.");
  }
  return { lat, lon, label: label.trim() };
}

export async function POST(request: Request) {
  try {
    const { name, demo, area } = await readBody(request);
    const playerName = readName(name);
    const isDemo = demo === true;
    const location = isDemo ? SAMPLE_AREA : readArea(area);
    const places = isDemo ? SAMPLE_PLACES : await findPlaces(location);
    if (places.length < 2) throw new RoomError("There aren't enough restaurants nearby. Try a different area.", 422);
    const { code, token } = await createRoom(playerName, location.label, places, isDemo);
    const response = NextResponse.json({ code }, { status: 201 });
    setRoomCookie(response, code, token, request);
    return response;
  } catch (error) {
    return routeError(error);
  }
}
