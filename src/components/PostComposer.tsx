import { Show } from "solid-js";
import { useAction, useSubmission } from "@solidjs/router";

import { sendPost } from "~/lib/bsky";

export default function PostComposer() {
  const postAction = useAction(sendPost);
  const submission = useSubmission(sendPost);

  return (
    <article>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const res = await postAction(new FormData(form));
          if (res) {
            form.reset();
          }
        }}
      >
        <textarea
          name="text"
          rows={3}
          maxLength={300}
          placeholder="What are you doing?"
          required
        />
        <button type="submit" disabled={submission.pending}>
          {submission.pending ? "Posting..." : "Post"}
        </button>
      </form>

      <Show when={submission.error}>
        {(err) => <small>{String((err() as Error)?.message ?? "Failed to post")}</small>}
      </Show>
    </article>
  );
}
