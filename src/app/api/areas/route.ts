import { NextRequest, NextResponse } from "next/server";
import { searchAreas } from "@/lib/places";
import { routeError } from "@/lib/http";
import { RoomError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query || query.length < 2 || query.length > 100) throw new RoomError("invalidQuery");
    return NextResponse.json({ areas: await searchAreas(query) });
  } catch (error) {
    return routeError(error);
  }
}
