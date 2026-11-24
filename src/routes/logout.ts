import type { APIEvent } from "@solidjs/start/server";

import { oauth } from "~/server/oauth";
import { readUserSession, destroyUserSession } from "~/server/session";
import { PUBLIC_URL } from "~/server/env";

export async function GET({ request }: APIEvent) {
    const { data } = await readUserSession();

    const did = data.user?.did;

    if (did) await oauth.revoke(did as any);

    await destroyUserSession();

    return Response.redirect(new URL("/", PUBLIC_URL));
}