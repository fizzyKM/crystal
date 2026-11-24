import type { APIEvent } from "@solidjs/start/server";

import { oauth } from "~/server/oauth";
import { saveUserSession } from "~/server/session";
import { PUBLIC_URL } from "~/server/env";

export async function GET({ request }: APIEvent) {
    const incoming = new URL(request.url, PUBLIC_URL);
    const callbackURL = new URL(`${incoming.pathname}${incoming.search}`, PUBLIC_URL);

    const { session, state } = await oauth.callback(callbackURL.searchParams);

    await saveUserSession({
        user: {
            did: session.did
        }
    });

    const returnTo = typeof state === "object"
					&& state != null && "returnTo" in state
					&& typeof state.returnTo === "string"
					&& state.returnTo.startsWith("/") ? state.returnTo : "/";

    return Response.redirect(new URL(returnTo, PUBLIC_URL));
}