import { RoomError } from "./errors";
import type { CuisineOption } from "./restaurant-filters";
import { placeNameKey, type Place } from "./types";

const MAX_WEB_PLACES = 10;
const NUMBERED_ENTRY = /(?:^|[\n;·|])\s*(?:\*{1,2})?\d{1,2}[.)]\s+([^\n;·|]+)/g;
const NUMBERED_HEADING = /^#{2,5}\s+\*{0,2}\d{1,2}[.)]\s+([^\n]+)/gm;

type SearchResult = { title?: string; url?: string; content?: string; raw_content?: string };
type Candidate = { name: string; sourceUrl: string; locality: number; publishers: Set<string> };

function restaurantName(entry: string) {
  if (/\b(?:permanently|temporarily) closed\b/i.test(entry)) return null;
  const trimmed = entry.replace(/^\[([^\]]+)\]\([^)]*\)/, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s*\[Review\]$/i, "")
    .trim();
  const [heading, description] = trimmed.split(/\s+[–—-]\s+/, 2);
  // Some food guides put the dish before the venue, as in "Satay – Terminal Satay Zul at Jalan…".
  const venue = description?.match(/^(.{3,70})\s+at\s+(?:Jalan|Kampung|Taman|Lorong)\b/i)?.[1];
  const name = (venue ?? (/\b(?:food|restaurants?)$/i.test(heading) ? description ?? heading : heading))
    .replace(/^.{12,65}:\s+(?=\p{L})/u, "")
    .split(/\s+@\s*|\s+\d\.\d\b|\[\.\.\.\]|\.\s+/, 1)[0]
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!:]+$/, "");
  if (name.length < 3 || name.length > 80 || name.split(" ").length > 10 ||
      !/\p{L}/u.test(name) ||
      /^(?:best|top|what|where|how|why|day|restaurants?\s+in)\b|\b(?:guide restaurants|food street|reviews|price range)\b|^(?:stall|restaurant|cafe)$|https?:|[?!]/i.test(name)) {
    return null;
  }
  return name;
}

function locationWords(value: string) {
  return placeNameKey(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim()
    .replace(/(\p{L}) (?=\d)/gu, "$1")
    .replace(/\bkl\b/g, "kuala lumpur");
}

function candidateKey(name: string, locations: string[]) {
  const key = locationWords(name.replace(/['’]/g, ""));
  const suffix = locations.find((location) => key.endsWith(` ${location}`));
  return suffix ? key.slice(0, -suffix.length).trimEnd() : key;
}

function sourceNames(result: SearchResult, url: URL) {
  if (/(^|\.)yelp\.com$/.test(url.hostname) && url.pathname.startsWith("/biz/")) {
    const name = restaurantName((result.title ?? "").split(" - ")[0]);
    return name && !/\b(?:resort|hotel|homestay)$/i.test(name) ? [name] : [];
  }
  const headings = typeof result.raw_content === "string"
    ? [...result.raw_content.slice(0, 100_000).matchAll(NUMBERED_HEADING)].flatMap(([, entry]) => restaurantName(entry) ?? [])
    : [];
  if (headings.length > 1) return headings;
  const snippet = result.content ?? "";
  const entries = [...snippet.matchAll(NUMBERED_ENTRY)].flatMap(([, entry]) => restaurantName(entry) ?? []);
  return entries.length > 1 ? entries : headings;
}

function searchCandidates(results: SearchResult[], locations: string[], cuisine: CuisineOption) {
  const restaurants = new Map<string, Candidate>();
  const lists = results.flatMap((result) => {
    if (!result || typeof result.url !== "string" || typeof result.title !== "string" ||
        typeof result.content !== "string") return [];
    let url: URL;
    try { url = new URL(result.url); } catch { return []; }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return [];
    const source = ` ${locationWords(`${result.title} ${url.pathname} ${url.search.replace(/%20|\+/g, " ")}`)} `;
    const match = locations.findIndex((location) => source.includes(` ${location} `));
    if (match === -1 || (cuisine !== "any" && !source.includes(` ${cuisine} `))) return [];
    const names = sourceNames(result, url);
    return names.length ? [{ url, names, locality: locations.length - match }] : [];
  });

  // Visit the top entry from each guide first. Repeated names across publishers rank higher.
  const depth = Math.max(0, ...lists.map(({ names }) => names.length));
  for (let index = 0; index < depth; index++) {
    for (const { url, names, locality } of lists) {
      const name = names[index];
      if (!name) continue;
      const key = candidateKey(name, locations);
      if (!key) continue;
      const publisher = url.hostname.replace(/^www\./, "");
      const existing = restaurants.get(key);
      if (existing) {
        existing.publishers.add(publisher);
        if (locality > existing.locality) {
          existing.locality = locality;
          existing.sourceUrl = url.href;
        }
      } else {
        restaurants.set(key, { name, sourceUrl: url.href, locality, publishers: new Set([publisher]) });
      }
    }
  }
  return [...restaurants.values()].sort((a, b) => b.locality - a.locality || b.publishers.size - a.publishers.size);
}

export async function findPlaces(area: string, cuisine: CuisineOption, hostNames: string[]): Promise<Place[]> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) throw new RoomError("placesUnconfigured", 503);
  const kind = cuisine === "any" ? "" : `${cuisine} `;
  let results: SearchResult[];
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `Best popular ${kind}restaurants in ${area}. Local restaurant names from ranked food guides.`,
        search_depth: "basic",
        max_results: 12,
        include_raw_content: "markdown",
        safe_search: true,
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Web search failed");
    const data = await response.json() as { results?: SearchResult[] };
    if (!Array.isArray(data.results)) throw new Error("Invalid web search response");
    results = data.results;
  } catch {
    throw new RoomError("placesUnavailable", 502);
  }

  const locations = area.split(",").map(locationWords).filter(Boolean).slice(0, 2);
  const hostKeys = new Set(hostNames.map((name) => candidateKey(name, locations)));
  return searchCandidates(results, locations, cuisine)
    .filter(({ name }) => !hostKeys.has(candidateKey(name, locations)))
    .slice(0, MAX_WEB_PLACES)
    .map(({ name, sourceUrl }, index) => ({
      id: `web-${String(index + 1).padStart(2, "0")}`,
      name, sourceUrl, provider: "web", cuisine: "Restaurant", address: "", distance: null,
    }));
}
