import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { GET as roomRoute, POST as changeRoom } from "../src/app/api/rooms/[code]/route";
import { POST as createRoute } from "../src/app/api/rooms/route";
import { withRoomTransaction } from "../src/lib/db";
import { createRoom } from "../src/lib/rooms";
import { mapsLink, SAMPLE_PLACES, type RoomState } from "../src/lib/types";

process.env.TURSO_DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), "bitesync-web-")), "test.db")}`;

const area = "SS 15, Subang Jaya, Malaysia";
const createNearby = (overrides: object = {}) => createRoute(new Request("http://localhost/api/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Alex", area, ...overrides }),
}));

function useSearchKey(context: TestContext, key?: string) {
  const previous = process.env.TAVILY_API_KEY;
  if (key) process.env.TAVILY_API_KEY = key;
  else delete process.env.TAVILY_API_KEY;
  context.after(() => {
    if (previous === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = previous;
  });
}

test("a mixed room uses one web search and saves source-linked picks for the whole round", async (context) => {
  useSearchKey(context, "test-key");
  const fetchMock = context.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.tavily.com/search");
    assert.equal(init.method, "POST");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer test-key");
    const body = JSON.parse(String(init.body));
    assert.equal(body.search_depth, "basic");
    assert.match(body.query, /Japanese restaurants in SS 15, Subang Jaya, Malaysia/i);
    const nearby = Array.from({ length: 12 }, (_, index) => `### ${index + 3}. Sushi House ${index + 1}`).join("\n");
    return Response.json({ results: [
      { title: "Japanese restaurants in SS15", url: "https://guide.example/ss15", content: "Guide", raw_content: `### 1. **Sushi Garden**\n### 2. Sakura Cafe\n${nearby}` },
      { title: "Japanese restaurants in SS15", url: "https://food.example/ss15", content: "1. sushi garden SS15; 2. Kumo Kitchen; 3. Closed Shop [Temporarily Closed]" },
      { title: "Japanese restaurants in Subang Jaya", url: "https://other.example/subang-jaya", content: "1. Farther Grill; 2. Downtown Cafe" },
      { title: "Japanese restaurants in Tokyo", url: "https://remote.example", content: "1. Tokyo Grill; 2. Beach Cafe" },
      { title: "Indian restaurants in SS15", url: "https://indian.example/ss15", content: "1. Indian Grill; 2. Indian Cafe" },
      { title: "Japanese restaurants in SS15", url: "javascript:alert(1)", content: "1. Unsafe Grill; 2. Unsafe Cafe" },
    ] });
  });

  const created = await createNearby({ cuisine: "japanese", hostPlaces: [" Sakura  Cafe "] });
  assert.equal(created.status, 201);
  const { code } = await created.json() as { code: string };
  const url = `http://localhost/api/rooms/${code}`;
  const params = { params: Promise.resolve({ code }) };
  const readRoom = async () => {
    const response = await roomRoute(new NextRequest(url), params);
    assert.equal(response.status, 200);
    return await response.json() as RoomState;
  };
  const room = await readRoom();
  assert.equal(room.area, area);
  assert.equal(room.places.length, 11);
  assert.equal(room.places[0].name, "Sakura Cafe");
  assert.equal(room.places[0].provider, "host");
  const web = room.places.filter((place) => place.provider === "web");
  assert.equal(web[0].name, "Sushi Garden");
  assert.equal(web[0].sourceUrl, "https://guide.example/ss15");
  assert.ok(web.some(({ name }) => name === "Kumo Kitchen"));
  assert.equal(web.filter(({ name }) => /sushi garden/i.test(name)).length, 1);
  assert.ok(web.every(({ name, distance }) => distance === null && !/Sakura|Farther|Tokyo|Indian|Unsafe|Closed/i.test(name)));
  assert.equal(new URL(mapsLink(web[0], area)).searchParams.get("query"), `Sushi Garden, ${area}`);

  const cookie = created.headers.get("set-cookie")!.split(";")[0];
  const action = (body: object) => changeRoom(new NextRequest(url, {
    method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body),
  }), params);
  assert.equal((await action({ action: "start" })).status, 200);
  for (const place of room.places) {
    const vote = place.id === web[0].id ? "like" : "pass";
    assert.equal((await action({ action: "vote", vote, placeId: place.id })).status, 200);
  }
  const finished = await readRoom();
  assert.equal(finished.status, "finished");
  assert.deepEqual(finished.result?.place, web[0]);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("automatic search handles invalid input, missing credentials, quota failures, and empty results", async (context) => {
  useSearchKey(context);
  const fetchMock = context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 429 }));
  for (const [overrides, status, code] of [
    [{ area: null }, 400, "missingArea"],
    [{ area: " " }, 400, "invalidArea"],
    [{ cuisine: "__proto__" }, 400, "invalidRestaurantFilters"],
    [{}, 503, "placesUnconfigured"],
  ] as const) {
    const response = await createNearby(overrides);
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
  process.env.TAVILY_API_KEY = "test-key";
  const failed = await createNearby();
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).code, "placesUnavailable");
  fetchMock.mock.mockImplementation(async () => Response.json({ results: [] }));
  const empty = await createNearby();
  assert.equal(empty.status, 422);
  assert.equal((await empty.json()).code, "tooFewPlaces");
  assert.equal((await createNearby({ hostPlaces: ["Host Cafe", "Host Kitchen"] })).status, 201);
});

test("older complete snapshots load and former Google references get a recreate-room response with no provider requests", async (context) => {
  const fetchMock = context.mock.method(globalThis, "fetch", async () => {
    throw new Error("Stored rooms must not call an external provider");
  });
  const { code } = await createRoom("Alex", area, SAMPLE_PLACES, false);
  const readRoom = () => roomRoute(new NextRequest(`http://localhost/api/rooms/${code}`), { params: Promise.resolve({ code }) });
  const complete = await readRoom();
  assert.equal(complete.status, 200);
  assert.deepEqual((await complete.json()).places, SAMPLE_PLACES);
  for (const stored of [[{ id: "google-id", provider: "google", distance: 120 }], { areaPlaceId: "google-area", places: [] }]) {
    await withRoomTransaction("write", (tx) => tx.execute({
      sql: "UPDATE rooms SET places = ? WHERE code = ?", args: [JSON.stringify(stored), code],
    }));
    const legacy = await readRoom();
    assert.equal(legacy.status, 410);
    assert.equal((await legacy.json()).code, "legacyRoomUnavailable");
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
