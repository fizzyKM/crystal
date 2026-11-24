import type { APIEvent } from "@solidjs/start/server";

import { oauth } from "~/server/oauth";

export async function GET({ request }: APIEvent) {
    const handle = new URL(request.url).searchParams.get("handle");

    if (!handle || !handle.trim) {
        return new Response("Missing handle.", {
            status: 400,
            headers: {
                "Content-Type": "text/plain"
            }
        });
    }

    const { url } = await oauth.authorize({
        target: {
            type: "account",
            identifier: handle.trim() as any
        },

        state: {
            returnTo: "/"
        }
    });

    return Response.redirect(url.toString());
}