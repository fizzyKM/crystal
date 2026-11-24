import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { DATABASE_URL } from "./env";

const globalForDb = globalThis as unknown as {
  __atprotoSql?: NeonQueryFunction<false, false>;
  __atprotoDbInitialized?: boolean;
};

export const sql: NeonQueryFunction<false, false> = globalForDb.__atprotoSql ?? neon(DATABASE_URL as string);

globalForDb.__atprotoSql = sql;

export async function init(): Promise<void> {
  if (globalForDb.__atprotoDbInitialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expires BIGINT NOT NULL
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires)`;

  await sql`
    CREATE TABLE IF NOT EXISTS oauth_sessions (
      did TEXT PRIMARY KEY,
      sess TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state_id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      expires BIGINT NOT NULL
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states (expires)`;

  globalForDb.__atprotoDbInitialized = true;
}

await init();
