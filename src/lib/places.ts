import { RoomError } from "./errors";
import { DEFAULT_SEARCH_DISTANCE_KM, type SearchDistanceKm } from "./search-distance";
import type { Area, Place } from "./types";

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
    distance?: number;
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
  const radians = Math.PI / 180;
  const a = Math.sin((lat - area.lat) * radians / 2) ** 2 +
    Math.cos(area.lat * radians) * Math.cos(lat * radians) * Math.sin((lon - area.lon) * radians / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export async function findPlaces(area: Area, radiusKm: SearchDistanceKm = DEFAULT_SEARCH_DISTANCE_KM): Promise<Place[]> {
  const features = await geoapify("v2/places", {
    categories: "catering.restaurant",
    filter: `circle:${area.lon},${area.lat},${radiusKm * 1000}`,
    bias: `proximity:${area.lon},${area.lat}`,
    limit: "20",
  });

  const seen = new Set<string>();
  const places = features.flatMap(({ properties }) => {
    const { place_id: id, name, lat, lon, categories, distance } = properties;
    if (!id || !name || typeof lat !== "number" || typeof lon !== "number" || seen.has(id)) return [];
    seen.add(id);
    const category = categories?.find((entry) => entry.startsWith("catering.restaurant."));
    return [{
      id, name, lat, lon,
      address: properties.address_line2 || properties.formatted || "",
      distance: Math.round(distance ?? distanceFrom(area, lat, lon)),
      cuisine: category ? normalizeCuisine(category.split(".").at(-1)!) : "Restaurant",
    }];
  });

  return places.slice(0, 8);
}
