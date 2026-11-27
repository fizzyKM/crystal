import { Client } from "@atcute/client";
import type {} from "@atcute/atproto";
import type {} from "@atcute/bluesky";
import type {} from "@atcute/bluemoji";

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

export async function resolveHandle(handle: string): Promise<string> {
    const ctx = await requireAuth();

    if (!ctx) return "";

    const res = await ctx.client.get("com.atproto.identity.resolveHandle", {
        params: {
            handle: handle as any
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data.did;
}

export async function resolveUserEmoji(shortcode: string): Promise<any | null> {
    const ctx = await requireAuth();

    if (!ctx) return null;

    const cleanName = shortcode.replace(/^:|:$/g, "");
    const facetName = `:${cleanName}:`;

    let cursor: string | undefined;

    do {
        const res = await ctx.client.get("com.atproto.repo.listRecords", {
            params: {
                repo: ctx.did,
                collection: "blue.moji.collection.item",
                limit: 100,
                cursor: cursor
            }
        });

        if (!res.ok) return null;

        for (const item of res.data.records) {
            const val = item.value as any;
            const itemClean = val.name?.replace(/^:|:$/g, "");

            if (itemClean === cleanName && val.formats) {
                const formats: any = {
                    $type: "blue.moji.richtext.facet#formats_v1"
                };

                if (val.formats.png_128 && typeof val.formats.png_128 === "object" && "ref" in val.formats.png_128) {
                    formats.png_128 = val.formats.png_128.ref.$link;
                }

                if (val.formats.webp_128 && typeof val.formats.webp_128 === "object" && "ref" in val.formats.webp_128) {
                    formats.webp_128 = val.formats.webp_128.ref.$link;
                }

                if (val.formats.gif_128 && typeof val.formats.gif_128 === "object" && "ref" in val.formats.gif_128) {
                    formats.gif_128 = val.formats.gif_128.ref.$link;
                }

                if (val.formats.apng_128 && typeof val.formats.apng_128 === "object" && "ref" in val.formats.apng_128) {
                    formats.apng_128 = val.formats.apng_128.ref.$link;
                }

                if (val.formats.lottie && typeof val.formats.lottie === "object" && "ref" in val.formats.lottie) {
                    formats.lottie = val.formats.lottie.ref.$link;
                }

                return {
                    $type: "blue.moji.richtext.facet",
                    did: ctx.did,
                    name: facetName,
                    formats,
                    ...(val.alt ? { alt: val.alt } : {}),
                    ...(val.adultOnly !== undefined ? { adultOnly: val.adultOnly } : {}),
                    ...(val.labels ? { labels: val.labels } : {})
                };
            }
        }

        cursor = res.data.cursor;
    } while (cursor);

    return null;
}

export async function getProfile(handle: string, limit = 25, cursor?: string) {
    const ctx = await requireAuth();

    if (!ctx) return null;

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

export async function createPost(text: string, lang = "en", facets?: any) {
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
                ...(facets && facets.length > 0 ? { facets: facets } : {}),
                langs: [lang],
                createdAt: new Date().toISOString()
            }
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}

export async function likePost(uri: string, cid: string) {
    const ctx = await createAuthenticatedClient();

    if (!ctx) throw new Error("Not authenticated");

    const res = await ctx.client.post("com.atproto.repo.createRecord", {
        input: {
            repo: ctx.did,
            collection: "app.bsky.feed.like",
            record: {
                $type: "app.bsky.feed.like",
                subject: {
                    uri: uri,
                    cid: cid
                },
                createdAt: new Date().toISOString(),
                via: "Crystal"
            }
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}

export async function repost(uri: string, cid: string) {
    const ctx = await createAuthenticatedClient();

    if (!ctx) throw new Error("Not authenticated");

    const res = await ctx.client.post("com.atproto.repo.createRecord", {
        input: {
            repo: ctx.did,
            collection: "app.bsky.feed.repost",
            record: {
                $type: "app.bsky.feed.repost",
                subject: {
                    uri: uri,
                    cid: cid
                },
                createdAt: new Date().toISOString()
            }
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}

export async function bookmark(uri: string, cid: string) {
    const ctx = await createAuthenticatedClient();

    if (!ctx) throw new Error("Not authenticated");

    const res = await ctx.client.post("app.bsky.bookmark.createBookmark", {
        input: {
            uri: uri,
            cid: cid
        }
    });

    if (!res.ok) throw new Error(res.data.error);

    return res.data;
}
