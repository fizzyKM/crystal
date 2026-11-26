import { tokenize, type Token } from "@atcute/bluesky-richtext-parser";
import RichtextBuilder, { type FacetFeature } from "@atcute/bluesky-richtext-builder";
import type { AppBskyRichtextFacet } from "@atcute/bluesky";
import type { BlueMojiRichtextFacet } from "@atcute/bluemoji";
import { isDid, type Did } from "@atcute/lexicons/syntax";

export type BlueMojiFeature = BlueMojiRichtextFacet.Main;
export type MentionResolver = (handle: string) => Promise<Did | null>;
export type EmojiResolver = (alias: string) => Promise<BlueMojiFeature | null>;

function flatten(tokens: Token[]): string {
  return tokens.map((token) => {
    if ("content" in token) return token.content;
    if ("children" in token) return flatten(token.children);
    if ("escaped" in token) return token.escaped;

    return token.raw;
  }).join("");
}

export async function buildRichText(input: string, resolveMention: MentionResolver, resolveEmoji: EmojiResolver) {
  const trimmed = input.trim();
  const tokens = tokenize(trimmed);
  const builder = new RichtextBuilder();
  const mentionCache = new Map<string, Promise<Did | null>>();
  const emojiCache = new Map<string, Promise<BlueMojiFeature | null>>();

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        builder.addText(token.content);

        break;

      case "mention": {
        let pending = mentionCache.get(token.handle);

        if (!pending) {
          pending = resolveMention(token.handle);
          mentionCache.set(token.handle, pending);
        }

        const did = await pending;

        if (did && isDid(did)) {
          builder.addMention(token.raw, did);
        } else {
          builder.addText(token.raw);
        }

        break;
      }

      case "topic":
        builder.addTag(token.raw, `app.bsky.feed.post:${token.name}`);

        break;

      case "autolink":
        builder.addLink(token.url, token.url as `${string}:${string}`);

        break;

      case "link":
        builder.addLink(flatten(token.children), token.url as `${string}:${string}`);

        break;

      case "escape":
        builder.addText(token.escaped);

        break;

      case "code":
        builder.addText(token.content);

        break;

      case "strong":
      case "emphasis":
      case "underline":
      case "delete":
        builder.addText(flatten(token.children));

        break;

      case "emote": {
        let pending = emojiCache.get(token.raw);

        if (!pending) {
          pending = resolveEmoji(token.raw);
          emojiCache.set(token.raw, pending);
        }

        const emoji = await pending;

        if (emoji) {
          builder.addDecoratedText(
            token.raw,
            emoji as unknown as FacetFeature
          );
        } else {
          builder.addText(token.raw);
        }

        break;
      }
    }
  }

  return builder.build();
}

export type RichTextSegment =
  | { type: "text"; text: string }
  | { type: "mention"; text: string; did: string }
  | { type: "link"; text: string; uri: string }
  | { type: "tag"; text: string; tag: string }
  | { type: "bluemoji"; text: string; emoji: BlueMojiFeature };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function getBluemojiUrl(emoji: BlueMojiFeature, endpoint = "https://bsky.social"): string | null {
  const { did, formats } = emoji;

  if (!did || !formats) return null;

  const cid =
    (typeof formats.webp_128 === "string" && formats.webp_128) ||
    (typeof formats.gif_128 === "string" && formats.gif_128) ||
    (typeof formats.png_128 === "string" && formats.png_128) ||
    (typeof formats.apng_128 === "string" && formats.apng_128) ||
    null;

  if (!cid) return null;

  return `${endpoint}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

export function segmentPostText(
  text: string,
  facets?: AppBskyRichtextFacet.Main[]
): RichTextSegment[] {
  if (!text) return [];

  if (!facets || facets.length === 0) {
    return [{ type: "text", text }];
  }

  const bytes = encoder.encode(text);
  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);

  const segments: RichTextSegment[] = [];
  let cursor = 0;

  for (const facet of sorted) {
    const start = Math.max(0, Math.min(facet.index.byteStart, bytes.length));
    const end = Math.max(start, Math.min(facet.index.byteEnd, bytes.length));

    if (start < cursor) continue;

    if (start > cursor) {
      segments.push({
        type: "text",
        text: decoder.decode(bytes.slice(cursor, start))
      });
    }

    const sliceText = decoder.decode(bytes.slice(start, end));
    const features = facet.features as Array<
      AppBskyRichtextFacet.Main["features"][number] | BlueMojiFeature
    >;

    const bluemoji = features.find(
      (f): f is BlueMojiFeature => f.$type === "blue.moji.richtext.facet"
    );

    if (bluemoji) {
      segments.push({ type: "bluemoji", text: sliceText, emoji: bluemoji });
    } else {
      const feature = features[0];

      if (!feature) {
        segments.push({ type: "text", text: sliceText });
      } else if (feature.$type === "app.bsky.richtext.facet#mention") {
        segments.push({ type: "mention", text: sliceText, did: feature.did });
      } else if (feature.$type === "app.bsky.richtext.facet#link") {
        segments.push({ type: "link", text: sliceText, uri: feature.uri });
      } else if (feature.$type === "app.bsky.richtext.facet#tag") {
        segments.push({ type: "tag", text: sliceText, tag: feature.tag });
      } else {
        segments.push({ type: "text", text: sliceText });
      }
    }

    cursor = end;
  }

  if (cursor < bytes.length) {
    segments.push({
      type: "text",
      text: decoder.decode(bytes.slice(cursor))
    });
  }

  return segments;
}
