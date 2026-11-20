import { createClient, type Client, type Transaction } from "@libsql/client";

const schema = [
  `CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    area TEXT NOT NULL,
    demo INTEGER NOT NULL,
    places TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    deadline INTEGER
  )`,
  "CREATE INDEX IF NOT EXISTS rooms_created_at ON rooms(created_at)",
  `CREATE TABLE IF NOT EXISTS players (
    room_code TEXT NOT NULL,
    token TEXT NOT NULL,
    name TEXT NOT NULL,
    host INTEGER NOT NULL,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (room_code, token),
    FOREIGN KEY (room_code) REFERENCES rooms(code)
  )`,
  `CREATE TABLE IF NOT EXISTS ballots (
    room_code TEXT NOT NULL,
    token TEXT NOT NULL,
    place_id TEXT NOT NULL,
    vote TEXT NOT NULL CHECK (vote IN ('pass', 'like', 'crave', 'veto')),
    PRIMARY KEY (room_code, token, place_id),
    FOREIGN KEY (room_code, token) REFERENCES players(room_code, token)
  )`,
];

type DatabaseState = { client?: Promise<Client>; queue: Promise<void> };
const runtime = globalThis as typeof globalThis & { biteSyncDatabases?: Map<string, DatabaseState> };
const databases = runtime.biteSyncDatabases ??= new Map();

function getClient(url: string, state: DatabaseState) {
  if (!state.client) {
    const local = url.startsWith("file:");
    const authToken = local ? undefined : process.env.TURSO_AUTH_TOKEN;
    if (!local && (!authToken || authToken === "your-turso-auth-token")) {
      throw new Error("TURSO_AUTH_TOKEN is required for the remote database.");
    }
    const client = createClient({ url, authToken });
    state.client = client.batch(schema, "write").then(() => client).catch((error) => {
      client.close();
      state.client = undefined;
      throw error;
    });
  }
  return state.client;
}

export function withRoomTransaction<T>(mode: "read" | "write", work: (tx: Transaction) => Promise<T>): Promise<T> {
  const configuredUrl = process.env.TURSO_DATABASE_URL;
  const url = configuredUrl && configuredUrl !== "libsql://your-db-name.turso.io" ? configuredUrl : "file:bitesync.db";
  const state = databases.get(url) ?? { queue: Promise.resolve() };
  databases.set(url, state);

  async function run() {
    const client = await getClient(url, state);
    const tx = await client.transaction(mode);
    try {
      const value = await work(tx);
      if (mode === "write") await tx.commit();
      return value;
    } finally {
      tx.close();
    }
  }

  if (!url.startsWith("file:")) return run();

  // The native client opens a separate connection for each transaction.
  // Serialize local connections so concurrent diners don't contend for write locks.
  const result = state.queue.then(run);
  state.queue = result.then(() => {}, () => {});
  return result;
}
