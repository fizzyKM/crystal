import { Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { createAsync, query } from "@solidjs/router";

import { getAuthProfile, getTL } from "~/lib/bsky";

import LoginForm from "~/components/LoginForm";
import HomeFeed from "~/components/HomeFeed";

export const route = {
  preload: () => {
    void getAuthProfile();
    void getTL();
  }
};

export default function Home() {
  const profile = createAsync(() => getAuthProfile());

  return (
    <main>
      <Title>Crystal</Title>
      <Show when={profile()} fallback={<LoginForm />}>
        {(user) => (<HomeFeed />)}
      </Show>
    </main>
  );
}
