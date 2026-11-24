import { Client } from "@atcute/client";
import type {} from "@atcute/atproto";
import type {} from "@atcute/bluesky";

import { oauth } from "~/server/oauth";
import { readUserSession, destroyUserSession } from "~/server/session";

export async function createAuthenticatedClient() {
    const { data } = await readUserSession();

    const did = data.user?.did;

    if (!did) return null;

    try {
        const session = await oauth.restore(did as any);

        return {
            did: session.did,
            client: new Client({ handler: session })
        };
    } catch {
        await destroyUserSession();

        return null;
    }
}

export async function requireAuth() {
    const ctx = await createAuthenticatedClient();

    if (!ctx) return null;

    return ctx;
}

export async function getProfile(handle: string, limit = 25, cursor?: string) {
    const ctx = await requireAuth();

    const res = await ctx.client.get("app.bsky.actor.getProfile", {
        params: {
            actor: handle as any,
            limit: limit,
            cursor: cursor
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}

export async function getCurrentProfile(limit = 25, cursor?: string) {
    const ctx = await createAuthenticatedClient();

    if (!ctx) return null;

    const res = await ctx.client.get("app.bsky.actor.getProfile", {
        params: {
            actor: ctx.did,
            limit: limit,
            cursor: cursor
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}

export async function getTimeline(limit = 25, cursor?: string) {
    const ctx = await createAuthenticatedClient();

    if (!ctx) return null;

    const res = await ctx.client.get("app.bsky.feed.getTimeline", {
        params: {
            limit: limit,
            cursor: cursor
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}

export async function getAuthorFeed(handle: string, limit = 25, cursor?: string) {
    const ctx = await createAuthenticatedClient();

    if (!ctx) return null;

    const res = await ctx.client.get("app.bsky.feed.getAuthorFeed", {
        params: {
            actor: handle as any,
            limit: limit,
            cursor: cursor
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}

export async function createPost(text: string, lang = "en") {
    const ctx = await createAuthenticatedClient();

    if (!ctx) throw new Error("Not authenticated");
    
    const trimmed = text.trim();

    if (!trimmed) throw new Error("Post cannot be empty");

    const res = await ctx.client.post("com.atproto.repo.createRecord", {
        input: {
            repo: ctx.did,
            collection: "app.bsky.feed.post",
            record: {
                $type: "app.bsky.feed.post",
                text: trimmed,
                langs: [lang],
                createdAt: new Date().toISOString()
            }
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}