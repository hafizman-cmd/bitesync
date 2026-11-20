import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET as areasRoute } from "../src/app/api/areas/route";
import { POST as createRoute } from "../src/app/api/rooms/route";
import { findPlaces } from "../src/lib/places";

const area = { lat: 40.71, lon: -73.95, label: "Brooklyn, New York" };
const createNearby = (radiusKm?: unknown) => createRoute(new Request("http://localhost/api/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Alex", area, radiusKm }),
}));

test("Geoapify requests use the correct endpoints and normalize place cards", async (context) => {
  process.env.GEOAPIFY_API_KEY = "test-key";
  context.after(() => { delete process.env.GEOAPIFY_API_KEY; });
  context.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    assert.equal(url.hostname, "api.geoapify.com");
    assert.equal(url.searchParams.get("apiKey"), "test-key");
    if (url.pathname === "/v1/geocode/autocomplete") {
      assert.equal(url.searchParams.get("text"), "Brook");
      assert.equal(url.searchParams.get("format"), "geojson");
      assert.equal(url.searchParams.get("limit"), "5");
      return Response.json({ features: [
        { properties: { ...area, formatted: area.label } },
        { properties: { formatted: "Incomplete suggestion" } },
      ] });
    }

    assert.equal(url.pathname, "/v2/places");
    assert.equal(url.searchParams.get("categories"), "catering.restaurant");
    assert.equal(url.searchParams.get("filter"), "circle:-73.95,40.71,3000");
    const restaurant = {
      place_id: "taco",
      name: "Taco Shop",
      lat: 40.711,
      lon: -73.95,
      address_line2: "Brooklyn",
      categories: ["catering.restaurant", "catering.restaurant.mexican"],
    };
    return Response.json({ features: [
      { properties: restaurant },
      { properties: restaurant },
      { properties: { ...restaurant, place_id: "unnamed", name: undefined } },
    ] });
  });

  assert.equal((await areasRoute(new NextRequest("http://localhost/api/areas?q=B"))).status, 400);
  const response = await areasRoute(new NextRequest("http://localhost/api/areas?q=%20Brook%20"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { areas: [area] });

  const places = await findPlaces(area);
  assert.equal(places.length, 1);
  assert.equal(places[0].cuisine, "Mexican");
  assert.equal(places[0].distance, 111);
  assert.equal((await createNearby()).status, 422);
});

test("room creation forwards the selected radius and rejects unsupported values", async (context) => {
  process.env.GEOAPIFY_API_KEY = "test-key";
  context.after(() => { delete process.env.GEOAPIFY_API_KEY; });
  const filters: (string | null)[] = [];
  context.mock.method(globalThis, "fetch", async (input: string) => {
    filters.push(new URL(input).searchParams.get("filter"));
    return Response.json({ features: [] });
  });

  for (const radiusKm of [5, 10, 20]) {
    const response = await createNearby(radiusKm);
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, "tooFewPlaces");
  }

  for (const invalidRadius of [0, 7, 21, "10", null]) {
    const response = await createNearby(invalidRadius);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalidSearchDistance");
  }

  assert.deepEqual([...new Set(filters)], [
    "circle:-73.95,40.71,5000",
    "circle:-73.95,40.71,10000",
    "circle:-73.95,40.71,20000",
  ]);
});

test("wide searches include farther candidates even when the nearest page is full", async (context) => {
  process.env.GEOAPIFY_API_KEY = "test-key";
  context.after(() => { delete process.env.GEOAPIFY_API_KEY; });
  const center = { lat: 0, lon: 0, label: "Test area" };
  const restaurant = (id: string, lat: number) => ({
    properties: { place_id: id, name: id, lat, lon: 0, distance: 5 },
  });
  const nearby = Array.from({ length: 20 }, (_, index) => restaurant(`near-${index}`, 0.001 * (index + 1)));
  const biases = new Set<string>();
  context.mock.method(globalThis, "fetch", async (input: string) => {
    const params = new URL(input).searchParams;
    assert.equal(params.get("filter"), "circle:0,0,20000");
    const bias = params.get("bias")!;
    biases.add(bias);
    if (bias === "proximity:0,0") return Response.json({ features: nearby });
    if (bias.startsWith("proximity:0,-")) return new Response(null, { status: 502 });
    return Response.json({ features: [nearby[0], restaurant("middle", 0.08), restaurant("far", 0.15), restaurant("outside", 0.2)] });
  });

  const places = await findPlaces(center, 20);
  assert.equal(biases.size, 5);
  assert.equal(places.length, 8);
  assert.equal(new Set(places.map(({ id }) => id)).size, 8);
  assert.deepEqual(places.slice(0, 3).map(({ id, distance }) => [id, distance]), [
    ["near-0", 111],
    ["middle", 8896],
    ["far", 16679],
  ]);
  assert.ok(places.every(({ distance }) => distance <= 20_000));
});

test("nearby search handles missing credentials and provider failures", async (context) => {
  delete process.env.GEOAPIFY_API_KEY;
  context.after(() => { delete process.env.GEOAPIFY_API_KEY; });
  assert.equal((await createNearby()).status, 503);
  process.env.GEOAPIFY_API_KEY = "test-key";
  context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 429 }));
  assert.equal((await createNearby()).status, 502);
});
