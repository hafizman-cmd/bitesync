import { createHash, randomBytes } from "node:crypto";
import type { Transaction } from "@libsql/client";
import { withRoomTransaction } from "./db";
import { RoomError } from "./errors";
import { decide } from "./results";
import { MAX_PLAYERS, ROUND_SECONDS, type Place, type RoomState, type Vote } from "./types";

const ROOM_LIFETIME = 24 * 60 * 60 * 1000;
type LegacyPlaceReference = { id: string; distance: number; provider: "google" };

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function snapshot(tx: Transaction, code: string, token?: string): Promise<RoomState> {
  const rooms = await tx.execute({ sql: "SELECT * FROM rooms WHERE code = ? AND created_at > ?", args: [code, Date.now() - ROOM_LIFETIME] });
  const room = rooms.rows[0];
  if (!room) throw new RoomError("roomExpired", 404);
  const places = JSON.parse(String(room.places)) as (Place | LegacyPlaceReference)[] | { areaPlaceId?: string };
  if (!Array.isArray(places) || places.some((place) => place.provider === "google")) {
    throw new RoomError("legacyRoomUnavailable", 410);
  }
  const fullPlaces = places as Place[];

  const players = await tx.execute({ sql: "SELECT token, name, host FROM players WHERE room_code = ? ORDER BY host DESC, joined_at, token", args: [code] });
  const ballots = await tx.execute({ sql: "SELECT token, place_id, vote FROM ballots WHERE room_code = ?", args: [code] });
  const current = token ? digest(token) : "";
  const member = players.rows.find((player) => player.token === current);
  const roster = players.rows.map((player) => ({
    name: String(player.name),
    host: Boolean(player.host),
    done: ballots.rows.filter((ballot) => ballot.token === player.token).length >= places.length,
  }));
  const deadline = room.deadline === null ? null : Number(room.deadline);
  const now = Date.now();
  const status = deadline === null ? "lobby" : now >= deadline || roster.every(({ done }) => done) ? "finished" : "active";
  return {
    code, area: String(room.area), demo: Boolean(room.demo), deadline, status, serverTime: now, places: fullPlaces,
    players: roster,
    me: member ? {
      host: Boolean(member.host),
      votes: Object.fromEntries(ballots.rows.filter((ballot) => ballot.token === current).map((ballot) => [String(ballot.place_id), ballot.vote as Vote])),
    } : null,
    result: status === "finished" ? decide(fullPlaces, ballots.rows.map((ballot) => ({ placeId: String(ballot.place_id), vote: ballot.vote as Vote }))) : null,
  };
}

export async function createRoom(name: string, area: string, places: Place[], demo: boolean) {
  const code = randomBytes(9).toString("base64url");
  const token = randomBytes(24).toString("base64url");
  const storedPlaces = JSON.stringify(places);
  return withRoomTransaction("write", async (tx) => {
    const expiry = Date.now() - ROOM_LIFETIME;
    await tx.batch([
      { sql: "DELETE FROM ballots WHERE room_code IN (SELECT code FROM rooms WHERE created_at <= ?)", args: [expiry] },
      { sql: "DELETE FROM players WHERE room_code IN (SELECT code FROM rooms WHERE created_at <= ?)", args: [expiry] },
      { sql: "DELETE FROM rooms WHERE created_at <= ?", args: [expiry] },
      { sql: "INSERT INTO rooms (code, area, demo, places, created_at) VALUES (?, ?, ?, ?, ?)", args: [code, area, Number(demo), storedPlaces, Date.now()] },
      { sql: "INSERT INTO players VALUES (?, ?, ?, 1, ?)", args: [code, digest(token), name, Date.now()] },
    ]);
    return { code, token };
  });
}

export function getRoom(code: string, token?: string) {
  return withRoomTransaction("read", (tx) => snapshot(tx, code, token));
}

export type RoomAction =
  | { action: "join"; name: string }
  | { action: "start" }
  | { action: "vote"; placeId: string; vote: Vote };

export async function updateRoom(code: string, input: RoomAction, token?: string) {
  return withRoomTransaction("write", async (tx) => {
    const room = await snapshot(tx, code, token);

    if (input.action === "join") {
      if (room.me) return { room, token };
      if (room.status !== "lobby") throw new RoomError("alreadyStarted", 409);
      if (room.players.length >= MAX_PLAYERS) throw new RoomError("roomFull", 409);

      const newToken = randomBytes(24).toString("base64url");
      await tx.execute({ sql: "INSERT INTO players VALUES (?, ?, ?, 0, ?)", args: [code, digest(newToken), input.name, Date.now()] });
      return { room: await snapshot(tx, code, newToken), token: newToken };
    }

    if (!token || !room.me) throw new RoomError("joinFirst", 403);

    if (input.action === "start") {
      if (!room.me.host) throw new RoomError("hostOnly", 403);
      if (room.status !== "lobby") return { room };
      await tx.execute({ sql: "UPDATE rooms SET deadline = ? WHERE code = ?", args: [Date.now() + ROUND_SECONDS * 1000, code] });
    } else {
      if (!room.places.some((place) => place.id === input.placeId)) throw new RoomError("unknownPlace", 404);
      const previousVote = room.me.votes[input.placeId];
      if (previousVote === input.vote) return { room };
      if (room.status !== "active") throw new RoomError("votingClosed", 409);
      if (previousVote) throw new RoomError("duplicateVote", 409);
      if ((input.vote === "crave" || input.vote === "veto") && Object.values(room.me.votes).includes(input.vote)) {
        throw new RoomError("specialVoteUsed", 409);
      }
      await tx.execute({
        sql: "INSERT INTO ballots VALUES (?, ?, ?, ?)",
        args: [code, digest(token), input.placeId, input.vote],
      });
    }
    return { room: await snapshot(tx, code, token) };
  });
}
