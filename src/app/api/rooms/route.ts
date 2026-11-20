import { NextResponse } from "next/server";
import { RoomError } from "@/lib/errors";
import { readBody, readName, routeError, setRoomCookie } from "@/lib/http";
import { findPlaces } from "@/lib/places";
import { createRoom } from "@/lib/rooms";
import { DEFAULT_SEARCH_DISTANCE_KM, SEARCH_DISTANCES_KM } from "@/lib/search-distance";
import { SAMPLE_AREA, SAMPLE_PLACES, type Area } from "@/lib/types";

function readArea(value: unknown): Area {
  if (!value || typeof value !== "object") throw new RoomError("missingArea");
  const { lat, lon, label } = value as Partial<Area>;
  if (typeof lat !== "number" || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      typeof lon !== "number" || !Number.isFinite(lon) || Math.abs(lon) > 180 ||
      typeof label !== "string" || !label.trim() || label.length > 250) {
    throw new RoomError("invalidArea");
  }
  return { lat, lon, label: label.trim() };
}

export async function POST(request: Request) {
  try {
    const { name, demo, area, radiusKm = DEFAULT_SEARCH_DISTANCE_KM } = await readBody(request);
    const playerName = readName(name);
    const isDemo = demo === true;
    const location = isDemo ? SAMPLE_AREA : readArea(area);
    const searchDistance = SEARCH_DISTANCES_KM.find((distance) => distance === radiusKm);
    if (!isDemo && searchDistance === undefined) throw new RoomError("invalidSearchDistance");
    const places = isDemo ? SAMPLE_PLACES : await findPlaces(location, searchDistance);
    if (places.length < 2) throw new RoomError("tooFewPlaces", 422);
    const { code, token } = await createRoom(playerName, location.label, places, isDemo);
    const response = NextResponse.json({ code }, { status: 201 });
    setRoomCookie(response, code, token, request);
    return response;
  } catch (error) {
    return routeError(error);
  }
}
