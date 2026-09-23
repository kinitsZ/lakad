import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __tripsyncClient?: ReturnType<typeof postgres>;
  __tripsyncDb?: Db;
};

function connect(): Db {
  if (globalForDb.__tripsyncDb) return globalForDb.__tripsyncDb;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres database.",
    );
  }

  const client =
    globalForDb.__tripsyncClient ??
    postgres(url, {
      // Supabase's transaction-mode pooler (port 6543) can't use prepared statements.
      // Everywhere else they save a round trip on every query with parameters.
      prepare: new URL(url).port !== "6543",
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    });

  const db = drizzle(client, { schema });
  // Reused across dev hot reloads so we don't leak connections.
  globalForDb.__tripsyncClient = client;
  globalForDb.__tripsyncDb = db;
  return db;
}

/** Connects on first use, so a missing DATABASE_URL doesn't break the build. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(connect(), prop, receiver);
  },
});

export { schema };
