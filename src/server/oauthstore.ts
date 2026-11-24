import {
  type OAuthClientStores,
  type StoredSession,
  type StoredState,
} from "@atcute/oauth-node-client";

import { sql } from "./db";

export const PostgresStore: OAuthClientStores = {
  sessions: {
    async get(did, options) {
      options?.signal?.throwIfAborted();

      const rows = await sql`
        SELECT sess FROM oauth_sessions WHERE did = ${did}
      ` as Array<{ sess: string }>;

      const row = rows[0];

      if (!row) return undefined;

      return JSON.parse(row.sess) as StoredSession;
    },

    async set(did, session) {
      const serialized = JSON.stringify(session);

      await sql`
        INSERT INTO oauth_sessions (did, sess)
        VALUES (${did}, ${serialized})
        ON CONFLICT (did) DO UPDATE SET
          sess = EXCLUDED.sess
      `;
    },

    async delete(did) {
      await sql`DELETE FROM oauth_sessions WHERE did = ${did}`;
    },

    async clear() {
      await sql`DELETE FROM oauth_sessions`;
    }
  },

  states: {
    async get(stateID, options) {
      options?.signal?.throwIfAborted();

      const rows = await sql`
        SELECT state, expires FROM oauth_states WHERE state_id = ${stateID}
      ` as Array<{ state: string; expires: string | number }>;

      const row = rows[0];

      if (!row) return undefined;

      if (Number(row.expires) <= Date.now()) {
        await sql`DELETE FROM oauth_states WHERE state_id = ${stateID}`;

        return undefined;
      }

      return JSON.parse(row.state) as StoredState;
    },

    async set(stateID, state) {
      const expires = Math.min(state.expiresAt, Date.now() + 10 * 60 * 1000);
      const serialized = JSON.stringify(state);

      await sql`
        INSERT INTO oauth_states (state_id, state, expires)
        VALUES (${stateID}, ${serialized}, ${expires})
        ON CONFLICT (state_id) DO UPDATE SET
          state = EXCLUDED.state,
          expires = EXCLUDED.expires
      `;
    },

    async delete(stateID) {
      await sql`DELETE FROM oauth_states WHERE state_id = ${stateID}`;
    },

    async clear() {
      await sql`DELETE FROM oauth_states`;
    }
  }
};
