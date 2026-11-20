import { RoomError } from "./errors";
import { DEFAULT_SEARCH_DISTANCE_KM, type SearchDistanceKm } from "./search-distance";
import type { Area, Place } from "./types";

const EARTH_RADIUS_METERS = 6_371_000;
const RADIANS_PER_DEGREE = Math.PI / 180;
const ROOM_PLACE_LIMIT = 8;

type Feature = {
  properties: {
    place_id?: string;
    name?: string;
    address_line2?: string;
    formatted?: string;
    street?: string;
    city?: string;
    lat?: number;
    lon?: number;
    categories?: string[];
  };
};

function normalizeCuisine(value: string) {
  return value.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

async function geoapify(path: string, params: Record<string, string>): Promise<Feature[]> {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key || key === "your-geoapify-api-key") {
    throw new RoomError("placesUnconfigured", 503);
  }

  const query = new URLSearchParams({ ...params, apiKey: key });
  try {
    const response = await fetch(`https://api.geoapify.com/${path}?${query}`, {
      signal: AbortSignal.timeout(7000),
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error("Places request failed");
    const data = await response.json() as { features?: Feature[] };
    return data.features ?? [];
  } catch {
    throw new RoomError("placesUnavailable", 502);
  }
}

export async function searchAreas(query: string): Promise<Area[]> {
  const features = await geoapify("v1/geocode/search", { text: query, limit: "5" });
  return features.flatMap(({ properties }) => {
    const { lat, lon, formatted } = properties;
    return typeof lat === "number" && typeof lon === "number" && formatted ? [{ lat, lon, label: formatted }] : [];
  });
}

function distanceFrom(area: Area, lat: number, lon: number) {
  const a = Math.sin((lat - area.lat) * RADIANS_PER_DEGREE / 2) ** 2 +
    Math.cos(area.lat * RADIANS_PER_DEGREE) * Math.cos(lat * RADIANS_PER_DEGREE) *
    Math.sin((lon - area.lon) * RADIANS_PER_DEGREE / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

function pointAlongBearing(area: Area, meters: number, bearing: number) {
  const lat = area.lat * RADIANS_PER_DEGREE;
  const angle = meters / EARTH_RADIUS_METERS;
  const targetLat = Math.asin(Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing));
  const deltaLon = Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat),
    Math.cos(angle) - Math.sin(lat) * Math.sin(targetLat));
  return {
    lat: targetLat / RADIANS_PER_DEGREE,
    lon: (area.lon + deltaLon / RADIANS_PER_DEGREE + 540) % 360 - 180,
  };
}

function mixByDistance(places: Place[], radiusMeters: number) {
  const bands: Place[][] = [[], [], []];
  for (const place of places.sort((a, b) => a.distance - b.distance)) {
    const band = Math.min(2, Math.floor(3 * place.distance / radiusMeters));
    bands[band].push(place);
  }

  const mixed: Place[] = [];
  const count = Math.min(ROOM_PLACE_LIMIT, places.length);
  for (let index = 0; mixed.length < count; index++) {
    for (const band of bands) {
      if (band[index]) mixed.push(band[index]);
    }
  }
  return mixed.slice(0, count);
}

export async function findPlaces(area: Area, radiusKm: SearchDistanceKm = DEFAULT_SEARCH_DISTANCE_KM): Promise<Place[]> {
  const radiusMeters = radiusKm * 1000;
  const wideSearch = radiusKm > DEFAULT_SEARCH_DISTANCE_KM;
  const search = ({ lon, lat }: Pick<Area, "lon" | "lat">) => geoapify("v2/places", {
    categories: "catering.restaurant",
    filter: `circle:${area.lon},${area.lat},${radiusMeters}`,
    bias: `proximity:${lon},${lat}`,
    limit: "20",
  });
  // Query toward the edges so dense nearby results cannot fill every provider page.
  const bearings = wideSearch ? [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2] : [];
  const [nearby, additional] = await Promise.all([
    search(area),
    Promise.allSettled(bearings.map((bearing) => search(pointAlongBearing(area, radiusMeters * 0.75, bearing)))),
  ]);
  const features = nearby.concat(additional.flatMap((result) => result.status === "fulfilled" ? result.value : []));

  const seen = new Set<string>();
  const places = features.flatMap(({ properties }) => {
    const { place_id: id, name, lat, lon, categories } = properties;
    if (!id || !name || typeof lat !== "number" || typeof lon !== "number" || seen.has(id)) return [];
    // Provider distances are relative to each query's bias point.
    const distance = distanceFrom(area, lat, lon);
    if (!Number.isFinite(distance) || distance > radiusMeters) return [];
    seen.add(id);
    const category = categories?.find((entry) => entry.startsWith("catering.restaurant."));
    return [{
      id, name, lat, lon,
      address: properties.address_line2 || properties.formatted || "",
      distance: Math.round(distance),
      cuisine: category ? normalizeCuisine(category.split(".").at(-1)!) : "Restaurant",
    }];
  });

  return wideSearch ? mixByDistance(places, radiusMeters) : places.slice(0, ROOM_PLACE_LIMIT);
}
