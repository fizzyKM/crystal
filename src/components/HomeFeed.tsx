import { createEffect, createSignal, For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";
import type { AppBskyFeedDefs } from "@atcute/bluesky";

import { getTL } from "~/lib/bsky";

import PostCard from "~/components/PostCard";
import PostComposer from "~/components/PostComposer";

export default function HomeFeed() {
  const initialPage = createAsync(() => getTL(25));

  const [items, setItems] = createSignal<AppBskyFeedDefs.FeedViewPost[]>([]);
  const [cursor, setCursor] = createSignal<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = createSignal(false);

  createEffect(() => {
    const page = initialPage();

    if (page) {
      setItems(page.feed ?? []);
      setCursor(page.cursor);
    }
  });

  async function loadMore() {
    const nextCursor = cursor();

    if (!nextCursor || loadingMore()) return;

    setLoadingMore(true);

    try {
      const nextPage = await getTL(25, nextCursor);

      if (nextPage?.feed?.length) {
        setItems((prev) => [...prev, ...nextPage.feed]);
        setCursor(nextPage.cursor);
      } else {
        setCursor(undefined);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section>
      <PostComposer />

      <Show when={items().length > 0} fallback={<p>Loading timeline...</p>}>
        <For each={items()}>{(item) => <PostCard item={item} />}</For>
      </Show>

      <Show when={cursor()}>
        <button type="button" onClick={loadMore} disabled={loadingMore()}>
          {loadingMore() ? "Loading..." : "Load more"}
        </button>
      </Show>
    </section>
  );
}
