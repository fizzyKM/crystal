import { For, Show } from "solid-js";
import { useAction, useSubmission } from "@solidjs/router";
import { MdFillComment, MdFillFavorite, MdFillLoop } from "solid-icons/md";
import type { AppBskyFeedDefs, AppBskyEmbedImages } from "@atcute/bluesky";

import { sendLike } from "~/lib/bsky";

type FeedItem = AppBskyFeedDefs.FeedViewPost;

function getPostText(record: unknown): string {
  if (record && typeof record === "object" && "text" in record) {
    return String((record as { text?: unknown }).text ?? "");
  }

  return "";
}

function getCreatedAt(record: unknown): string {
  if (record && typeof record === "object" && "createdAt" in record) {
    const raw = (record as { createdAt?: unknown }).createdAt;

    if (typeof raw === "string") {
      const date = new Date(raw);

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }
  }

  return "";
}

export default function PostCard(props: { item: FeedItem }) {
  const post = () => props.item.post;
  const author = () => post().author;
  const reason = () => props.item.reason;
  const like = useAction(sendLike);
  const likeSubmission = useSubmission(sendLike);

  const handleLike = async () => {
    const formData = new FormData();

    formData.set("uri", post().uri);
    formData.set("cid", post().cid);

    await like(formData);
  }

  const images = (): AppBskyEmbedImages.ViewImage[] => {
    const embed = post().embed;

    if (embed && embed.$type === "app.bsky.embed.images#view") {
      return embed.images ?? [];
    }

    return [];
  };

  return (
    <article>
      <header>
        <Show when={reason()?.$type === "app.bsky.feed.defs#reasonRepost"}>
          <MdFillLoop />
          <small>Reposted</small>
        </Show>

        <div>
          <Show when={author().avatar}>
            {(avatarUrl) => (
              <img
                src={avatarUrl()}
                alt={author().displayName || author().handle}
                width={32}
                height={32}
              />
            )}
          </Show>
          &nbsp;
          <a href={`/profile?handle=${encodeURIComponent(author().handle)}`}>
            <strong>{author().displayName || `@${author().handle}`}</strong>
          </a>
          &nbsp;
          <a href={`/profile?handle=${encodeURIComponent(author().handle)}`}>
            <small>@{author().handle}</small>
          </a>
        </div>

        <Show when={getCreatedAt(post().record)}>
          {(timestamp) => <small>{timestamp()}</small>}
        </Show>
      </header>

      <p>{getPostText(post().record)}</p>

      <Show when={images().length > 0}>
        <div style={{
          display: "grid",
          "grid-template-columns": "repeat(5, minmax(0, 1fr))",
          gap: "6px",
          "max-width": "420px"
        }}>
          <For each={images()}>
            {(img) => (
              <a href={img.fullsize} style={{
                display: "block",
                "aspect-ratio": "1 / 1",
                overflow: "hidden",
                "border-radius": "6px"
              }}>
                <img src={img.thumb} alt={img.alt || ""} loading="lazy" style={{
                  width: "100%",
                  height: "100%",
                  "object-fit": "cover",
                  display: "block"
                }} />
              </a>
            )}
          </For>
        </div>
      </Show>

      <footer>
        <small>
          <button>
            <MdFillComment /> {post().replyCount ?? 0}
          </button>
          &nbsp;
          <button>
            <MdFillLoop /> {post().repostCount ?? 0}
          </button>
          &nbsp;
          <button onClick={handleLike} disabled={likeSubmission.pending}>
            <MdFillFavorite /> {post().likeCount ?? 0}
          </button>
        </small>
      </footer>
    </article>
  );
}
