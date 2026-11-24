import { query, action } from "@solidjs/router";

import {
    getProfile,
    getCurrentProfile,
    getTimeline,
    getAuthorFeed,
    createPost,
    likePost
} from "~/server/api";

export const getAuthProfile = query(async () => {
    "use server";

    return await getCurrentProfile();
}, "auth-profile");

export const getUser = query(async (handle: string, limit?: number, cursor?: string) => {
    "use server";

    return {
        profile: await getProfile(handle),
        posts: await getAuthorFeed(handle, limit, cursor)
    }
}, "bsky-user");

export const getTL = query(async (limit?: number, cursor?: string) => {
    "use server";

    return await getTimeline(limit ?? 25, cursor);
}, "bsky-timeline")

export const sendPost = action(async (formData: FormData) => {
    "use server";

    const text = String(formData.get("text") ?? "");

    return await createPost(text);
}, "bsky-create-post");

export const sendLike = action(async (formData: FormData) => {
    "use server";

    const uri = String(formData.get("uri") ?? "");
    const cid = String(formData.get("cid") ?? "");

    if (!uri || !cid) throw new Error("Missing AT URI or CID");

    return await likePost(uri, cid);
});
