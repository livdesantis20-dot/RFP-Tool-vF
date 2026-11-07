import os from "os";
import path from "path";
import fs from "fs";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";
import { BOOTSTRAP_SQL } from "./bootstrap";
import { seedDefaults } from "./seed";

// Two modes:
//  - DATABASE_URL set (Neon / any Postgres, e.g. on Vercel) → postgres-js
//  - otherwise → embedded PGlite (Postgres in WASM). Stored on disk locally,
//    in memory on Vercel (resets on cold start — fine for a demo, set DATABASE_URL
//    for anything persistent).
// Both expose the same Drizzle query API; we type everything as the postgres-js flavor.
export type DB = PostgresJsDatabase<typeof schema>;

type Holder = { db: DB; exec: (sql: string) => Promise<void>; ready?: Promise<void> };
const g = globalThis as unknown as { __msaDb?: Holder };

export function localDataDir(): string {
  if (process.env.PGLITE_DIR) return process.env.PGLITE_DIR;
  // Outside the project folder on purpose (keeps the DB out of OneDrive/git).
  return path.join(os.homedir(), ".msa-rfp-portal", "pglite");
}

function create(): Holder {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false });
    return {
      db: drizzlePg(client, { schema }),
      exec: async (sql) => {
        await client.unsafe(sql);
      },
    };
  }
  let dataDir: string;
  if (process.env.VERCEL) {
    dataDir = "memory://";
  } else {
    dataDir = localDataDir();
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const client = new PGlite(dataDir);
  return {
    db: drizzlePglite(client, { schema }) as unknown as DB,
    exec: async (sql) => {
      await client.exec(sql);
    },
  };
}

// Lazy: nothing connects until the first query (keeps `next build` workers from
// all opening the same embedded database).
function getHolder(): Holder {
  return g.__msaDb ?? (g.__msaDb = create());
}

export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getHolder().db as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

// Creates tables + demo defaults once per process. Safe to call repeatedly.
export function ensureDb(): Promise<void> {
  const holder = getHolder();
  if (!holder.ready) {
    holder.ready = (async () => {
      await holder.exec(BOOTSTRAP_SQL);
      await seedDefaults(db);
      // Demo deployments open on a ready-made starting point (dynamic import avoids a cycle).
      const { seedDemoIfNeeded } = await import("@/lib/sample/load");
      await seedDemoIfNeeded();
    })().catch((e) => {
      holder.ready = undefined;
      throw e;
    });
  }
  return holder.ready;
}

export * from "./schema";
