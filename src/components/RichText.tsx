import { For, createMemo, createSignal } from "solid-js";
import type { AppBskyRichtextFacet } from "@atcute/bluesky";

export interface BluemojiFacetFeature {
  $type: "blue.moji.richtext.facet";
  did: string;
  name: string;
  alt?: string;
  adultOnly?: boolean;
  formats?: {
    $type?: string;
    png_128?: string | boolean;
    webp_128?: string | boolean;
    gif_128?: string | boolean;
    apng_128?: string | boolean;
    lottie?: string | boolean;
  };
}

type RichTextSegment =
  | { type: "text"; text: string }
  | { type: "mention"; text: string; did: string }
  | { type: "link"; text: string; uri: string }
  | { type: "tag"; text: string; tag: string }
  | { type: "bluemoji"; text: string; emoji: BluemojiFacetFeature };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getBluemojiUrl(emoji: BluemojiFacetFeature, endpoint = "https://bsky.social"): string | null {
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

function segmentPostText(text: string, facets?: AppBskyRichtextFacet.Main[]): RichTextSegment[] {
  if (!text) return [];

  if (!facets || facets.length === 0) {
    return [{ type: "text", text }];
  }

  const bytes = encoder.encode(text);

  const sorted = [...facets].sort(
    (a, b) => a.index.byteStart - b.index.byteStart
  );

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
    const features = facet.features as Array<AppBskyRichtextFacet.Main["features"][number] | BluemojiFacetFeature>;
    const bluemoji = features.find((f): f is BluemojiFacetFeature => f.$type === "blue.moji.richtext.facet");

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

function BluemojiInline(props: {emoji: BluemojiFacetFeature, fallbackText: string}) {
  const [failed, setFailed] = createSignal(false);
  const src = () => getBluemojiUrl(props.emoji);

  return (
    <>
      {src() && !failed() ? (
        <img
          src={src()!}
          alt={props.emoji.alt || props.emoji.name || props.fallbackText}
          title={props.emoji.name || props.fallbackText}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            display: "inline-block",
            height: "1.25em",
            width: "auto",
            "vertical-align": "-0.25em",
            margin: "0 0.08em"
          }}
        />
      ) : (
        <span>{props.fallbackText}</span>
      )}
    </>
  );
}

export default function RichText(props: {text: string; facets?: AppBskyRichtextFacet.Main[]; }) {
  const segments = createMemo(() => segmentPostText(props.text, props.facets));

  return (
    <p style={{ "white-space": "pre-wrap", "word-break": "break-word" }}>
      <For each={segments()}>
        {(seg) => {
          switch (seg.type) {
            case "mention":
              return <a href={`/profile?handle=${encodeURIComponent(seg.did)}`}>{seg.text}</a>;

            case "link":
              return <a href={seg.uri} target="_blank" rel="noopener noreferrer">{seg.text}</a>;

            case "tag":
              return <a href={`/search?q=${encodeURIComponent(`#${seg.tag}`)}`}>{seg.text}</a>;

            case "bluemoji":
              return <BluemojiInline emoji={seg.emoji} fallbackText={seg.text} />;

            case "text":
            default:
              return <>{seg.text}</>;
          }
        }}
      </For>
    </p>
  );
}
