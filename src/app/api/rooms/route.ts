import { NextResponse } from "next/server";
import { RoomError } from "@/lib/errors";
import { readBody, readName, routeError, setRoomCookie } from "@/lib/http";
import { findPlaces } from "@/lib/places";
import { CUISINE_OPTIONS } from "@/lib/restaurant-filters";
import { createRoom } from "@/lib/rooms";
import { MAX_HOST_PLACES, MAX_HOST_PLACE_NAME, SAMPLE_AREA, SAMPLE_PLACES, formatHostPlaceName, placeNameKey, type Place } from "@/lib/types";

function readArea(value: unknown) {
  if (value == null || value === "") throw new RoomError("missingArea");
  if (typeof value !== "string" || value.trim().length < 2 || value.length > 100) throw new RoomError("invalidArea");
  return value.trim().replace(/\s+/g, " ");
}

function readHostPlaces(value: unknown): Place[] {
  if (!Array.isArray(value) || value.length > MAX_HOST_PLACES) throw new RoomError("invalidHostPlaces");
  const seen = new Set<string>();
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.length > MAX_HOST_PLACE_NAME || !entry.trim()) {
      throw new RoomError("invalidHostPlaces");
    }
    const key = placeNameKey(entry);
    if (seen.has(key)) throw new RoomError("duplicateHostPlace");
    seen.add(key);
    return { id: `host-${index + 1}`, name: formatHostPlaceName(entry), provider: "host", cuisine: "Restaurant", address: "", distance: null };
  });
}

export async function POST(request: Request) {
  try {
    const { name, demo, area, cuisine = "any", includeAutomatic = true, hostPlaces = [] } = await readBody(request);
    const playerName = readName(name);
    const isDemo = demo === true;
    if (!isDemo && typeof includeAutomatic !== "boolean") throw new RoomError("invalidRequest");
    const automatic = !isDemo && includeAutomatic;
    const picks = isDemo ? [] : readHostPlaces(hostPlaces);
    if (!isDemo && !automatic && picks.length < 2) throw new RoomError("tooFewHostPlaces", 422);
    const cuisineOption = CUISINE_OPTIONS.find((option) => option === cuisine);
    if (automatic && !cuisineOption) throw new RoomError("invalidRestaurantFilters");
    const areaLabel = isDemo ? SAMPLE_AREA.label : automatic ? readArea(area) : "";
    const suggested = automatic ? await findPlaces(areaLabel, cuisineOption ?? "any", picks.map(({ name }) => name)) : [];
    const places = isDemo ? SAMPLE_PLACES : [...picks, ...suggested];
    if (places.length < 2) {
      throw new RoomError("tooFewPlaces", 422);
    }
    const { code, token } = await createRoom(playerName, areaLabel, places, isDemo);
    const response = NextResponse.json({ code }, { status: 201 });
    setRoomCookie(response, code, token, request);
    return response;
  } catch (error) {
    return routeError(error);
  }
}
