import * as crypto from "node:crypto";
import { deleteCookie, getCookie, getRequestProtocol, setCookie } from "@solidjs/start/http";

import { init, sql } from "./db";
import { NODE_ENV } from "./env";

export type AppSessionData = {
  user?: {
    did: string;
  };
};

const COOKIE_NAME = "sid";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export async function readUserSession(): Promise<{
  sid: string | undefined;
  data: AppSessionData;
}> {
  await init();

  const sid = getCookie(COOKIE_NAME);

  if (!sid) {
    return {
      sid: undefined,
      data: {},
    };
  }

  const now = Date.now();

  const rows = await sql`
    SELECT sess FROM sessions WHERE sid = ${sid} AND expires > ${now}
  ` as Array<{ sess: string }>;

  const row = rows[0];

  if (!row) {
    return {
      sid,
      data: {},
    };
  }

  return {
    sid,
    data: JSON.parse(row.sess) as AppSessionData,
  };
}

export async function saveUserSession(data: AppSessionData): Promise<string> {
  await init();

  const sid = getCookie(COOKIE_NAME) || crypto.randomUUID();
  const expires = Date.now() + MAX_AGE_MS;
  const serialized = JSON.stringify(data);
  const isHttps = NODE_ENV === "production" || getRequestProtocol() === "https";

  await sql`
    INSERT INTO sessions (sid, sess, expires)
    VALUES (${sid}, ${serialized}, ${expires})
    ON CONFLICT (sid) DO UPDATE SET
      sess = EXCLUDED.sess,
      expires = EXCLUDED.expires
  `;

  setCookie(COOKIE_NAME, sid, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  });

  return sid;
}

export async function destroyUserSession(): Promise<void> {
  await init();

  const sid = getCookie(COOKIE_NAME);
  const isHttps = NODE_ENV === "production" || getRequestProtocol() === "https";

  if (sid) await sql`DELETE FROM sessions WHERE sid = ${sid}`;

  deleteCookie(COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
  });
}
