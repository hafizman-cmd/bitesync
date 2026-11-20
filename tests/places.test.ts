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
    if (url.pathname === "/v1/geocode/search") {
      assert.equal(url.searchParams.get("text"), "Brooklyn");
      return Response.json({ features: [{ properties: { ...area, formatted: area.label } }] });
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

  const response = await areasRoute(new NextRequest("http://localhost/api/areas?q=Brooklyn"));
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

  assert.deepEqual(filters, [
    "circle:-73.95,40.71,5000",
    "circle:-73.95,40.71,10000",
    "circle:-73.95,40.71,20000",
  ]);
});

test("nearby search handles missing credentials and provider failures", async (context) => {
  delete process.env.GEOAPIFY_API_KEY;
  context.after(() => { delete process.env.GEOAPIFY_API_KEY; });
  assert.equal((await createNearby()).status, 503);
  process.env.GEOAPIFY_API_KEY = "test-key";
  context.mock.method(globalThis, "fetch", async () => new Response(null, { status: 429 }));
  assert.equal((await createNearby()).status, 502);
});
