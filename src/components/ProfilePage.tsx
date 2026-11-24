import { createEffect, createSignal, For, Show } from "solid-js";
import { createAsync } from "@solidjs/router";
import type { AppBskyFeedDefs } from "@atcute/bluesky";

import { getUser } from "~/lib/bsky";

import PostCard from "~/components/PostCard";

export default function ProfilePage(props: { handle: string }) {
  const initialPage = createAsync(async () => {
    const res = await getUser(props.handle, 25);

    return res;
  });

  const profile = () => initialPage()?.profile;

  const [items, setItems] = createSignal<AppBskyFeedDefs.FeedViewPost[]>([]);
  const [cursor, setCursor] = createSignal<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = createSignal(false);

  createEffect(() => {
    const page = initialPage()?.posts;

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
      const nextPage = (await getUser(props.handle, 25, nextCursor)).posts;

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
      <Show when={profile()} fallback={<p>Loading profile...</p>}>
        {(user) => (
          <article>
            <h1>{user().displayName}</h1>
            <small>{user().handle} | {user().pronouns}</small>
            <ul>
              <li>{user().postsCount} posts</li>
              <li>{user().followsCount} following</li>
              <li>{user().followersCount} followers</li>
            </ul>
            <Show when={profile()?.links?.length}>
              <h2>Links</h2>
              <ul>
                <For each={profile()?.links}>
                  {(link) => (
                    <li><a href={link.url} target="_blank">{link.title || link.url}</a></li>
                  )}
                </For>
              </ul>
            </Show>
          </article>
        )}
      </Show>

      <Show when={items().length > 0} fallback={<p>Loading posts...</p>}>
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
