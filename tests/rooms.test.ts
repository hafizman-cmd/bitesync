import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET as getRoomRoute, POST as changeRoomRoute } from "../src/app/api/rooms/[code]/route";
import { POST as createRoomRoute } from "../src/app/api/rooms/route";
import { withRoomTransaction } from "../src/lib/db";
import { errors, RoomError } from "../src/lib/errors";
import { decide } from "../src/lib/results";
import { createRoom, getRoom, updateRoom } from "../src/lib/rooms";
import { mapsLink, MAX_HOST_PLACES, SAMPLE_AREA, SAMPLE_PLACES, type RoomState } from "../src/lib/types";

const folder = mkdtempSync(join(tmpdir(), "bitesync-"));
process.env.TURSO_DATABASE_URL = `file:${join(folder, "test.db")}`;

test("a veto overrides any score and ties rank by support then distance", () => {
  const [a, b, c] = SAMPLE_PLACES;
  assert.equal(decide([a, b], []) , null);
  assert.equal(decide([a, b], [{ placeId: a.id, vote: "like" }, { placeId: b.id, vote: "like" }])?.place.id, a.id);
  assert.equal(decide([a, b], [{ placeId: a.id, vote: "like" }, { placeId: b.id, vote: "crave" }])?.place.id, b.id);
  assert.equal(decide([a, b], [{ placeId: a.id, vote: "crave" }, { placeId: b.id, vote: "like" }, { placeId: b.id, vote: "like" }])?.place.id, b.id);
  assert.equal(decide([a, b, c], [
    { placeId: a.id, vote: "crave" }, { placeId: a.id, vote: "veto" }, { placeId: c.id, vote: "like" },
  ])?.place.id, c.id);
});

test("two diners share one result, with host permission and vote limits", async () => {
  const { code, token: host } = await createRoom("Alex", SAMPLE_AREA.label, SAMPLE_PLACES, true);
  const { token: guest } = await updateRoom(code, { action: "join", name: "Sam" });
  assert.ok(guest);
  assert.equal((await getRoom(code)).me, null);
  await assert.rejects(updateRoom(code, { action: "start" }, guest), (error) => error instanceof RoomError && error.status === 403);
  await assert.rejects(updateRoom(code, { action: "vote", placeId: SAMPLE_PLACES[0].id, vote: "like" }, host), /Voting is closed/);
  const { room: started } = await updateRoom(code, { action: "start" }, host);
  assert.equal(started.status, "active");
  assert.equal(started.players.length, 2);
  assert.ok(started.deadline && started.deadline - started.serverTime <= 90000);
  await assert.rejects(updateRoom(code, { action: "join", name: "Late diner" }), /already started/);

  const [a, b, c, d] = SAMPLE_PLACES.map(({ id }) => id);
  const vote = (token: string, placeId: string, vote: "like" | "pass" | "crave" | "veto") =>
    updateRoom(code, { action: "vote", placeId, vote }, token);
  await Promise.all([vote(host, a, "veto"), vote(guest, a, "crave")]);
  assert.equal((await vote(host, a, "veto")).room.me?.votes[a], "veto");
  await assert.rejects(vote(host, a, "pass"), /already voted/);
  await assert.rejects(vote(host, b, "veto"), /already used/);
  await assert.rejects(vote(guest, b, "crave"), /already used/);
  await vote(host, b, "like");
  await vote(host, c, "pass");
  assert.equal((await vote(host, d, "pass")).room.status, "active");
  await vote(guest, b, "like");
  await vote(guest, c, "pass");
  const { room: finished } = await vote(guest, d, "pass");
  assert.equal(finished.status, "finished");
  assert.equal(finished.result?.place.id, b);
  assert.equal(finished.result?.likes, 2);
  assert.deepEqual((await getRoom(code, host)).result, finished.result);
  assert.deepEqual((await getRoom(code)).result, finished.result);
});

test("the deadline closes an incomplete room and retains its votes", async () => {
  const { code, token } = await createRoom("Alex", SAMPLE_AREA.label, SAMPLE_PLACES, true);
  const placeId = SAMPLE_PLACES[0].id;
  await updateRoom(code, { action: "start" }, token);
  await updateRoom(code, { action: "vote", placeId, vote: "like" }, token);
  await withRoomTransaction("write", async (tx) => {
    await tx.execute({ sql: "UPDATE rooms SET deadline = ? WHERE code = ?", args: [Date.now() - 1, code] });
  });
  const expired = await getRoom(code, token);
  assert.equal(expired.status, "finished");
  assert.equal(expired.result?.place.id, placeId);
  await assert.rejects(updateRoom(code, { action: "vote", placeId: SAMPLE_PLACES[1].id, vote: "like" }, token), /closed/);
});

test("the room API validates input and keeps host authority in a scoped cookie", async () => {
  const headers = { "Content-Type": "application/json" };
  const origin = "https://example.test";
  const create = (data: object) => createRoomRoute(new Request(`${origin}/api/rooms`, { method: "POST", headers, body: JSON.stringify(data) }));
  const invalidName = await create({ name: " ", demo: true });
  assert.equal(invalidName.status, 400);
  assert.deepEqual(await invalidName.json(), { error: errors.invalidName.en, code: "invalidName" });
  assert.equal((await create({ name: "Alex", area: { lat: 91, lon: 0, label: "Invalid" } })).status, 400);
  const created = await create({ name: "Alex", demo: true });
  assert.equal(created.status, 201);
  const { code } = await created.json() as { code: string };
  const url = `${origin}/api/rooms/${code}`;
  const cookie = created.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.ok(cookie.includes(`Path=/api/rooms/${code}`));
  const context = { params: Promise.resolve({ code }) };
  const missing = { params: Promise.resolve({ code: randomBytes(9).toString("base64url") }) };
  assert.equal((await getRoomRoute(new NextRequest(url), missing)).status, 404);
  const start = (session?: string) => changeRoomRoute(new NextRequest(url, {
    method: "POST",
    headers: { ...headers, ...(session ? { Cookie: session } : {}) },
    body: JSON.stringify({ action: "start" }),
  }), context);
  const forbidden = await start();
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { error: errors.joinFirst.en, code: "joinFirst" });
  assert.equal((await start(cookie.split(";")[0])).status, 200);
  assert.equal((await getRoomRoute(new NextRequest(url), context)).headers.get("Cache-Control"), "private, no-store");
});

test("hosts can create a room from their own picks and vote without location or Google requests", async (context) => {
  const origin = "https://example.test";
  const headers = { "Content-Type": "application/json" };
  const fetchMock = context.mock.method(globalThis, "fetch", async () => {
    throw new Error("Manual rooms must not call an external provider");
  });
  const create = (hostPlaces: unknown) => createRoomRoute(new Request(`${origin}/api/rooms`, {
    method: "POST", headers, body: JSON.stringify({ name: "Alex", includeAutomatic: false, hostPlaces }),
  }));
  for (const [picks, status, code] of [
    [["Only one"], 422, "tooFewHostPlaces"],
    [["Warung Kita", " warung   kita "], 400, "duplicateHostPlace"],
    [["", "Cafe"], 400, "invalidHostPlaces"],
    [Array.from({ length: MAX_HOST_PLACES + 1 }, (_, index) => `Place ${index}`), 400, "invalidHostPlaces"],
  ] as const) {
    const invalid = await create(picks);
    assert.equal(invalid.status, status);
    assert.equal((await invalid.json()).code, code);
  }

  const created = await create(["  warung   kita ", "KFC café-grill"]);
  assert.equal(created.status, 201);
  const { code } = await created.json() as { code: string };
  const url = `${origin}/api/rooms/${code}`;
  const roomContext = { params: Promise.resolve({ code }) };
  const requestRoom = () => getRoomRoute(new NextRequest(url), roomContext);
  const room = await (await requestRoom()).json() as RoomState;
  assert.deepEqual(room.places.map(({ name, provider, distance }) => [name, provider, distance]), [
    ["Warung Kita", "host", null],
    ["KFC Café-Grill", "host", null],
  ]);
  assert.equal(new URL(mapsLink(room.places[0])).searchParams.get("query"), "Warung Kita");

  const act = (body: object, cookie?: string) => changeRoomRoute(new NextRequest(url, {
    method: "POST",
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  }), roomContext);
  const host = created.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await act({ action: "start" })).status, 403);
  assert.equal((await act({ action: "start" }, host)).status, 200);
  for (const place of room.places) {
    assert.equal((await act({ action: "vote", placeId: place.id, vote: "like" }, host)).status, 200);
  }
  const finished = await (await requestRoom()).json() as RoomState;
  assert.equal(finished.status, "finished");
  assert.equal(finished.result?.place.name, "Warung Kita");
  assert.equal(fetchMock.mock.callCount(), 0);
});
