import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";

import ProfilePage from "~/components/ProfilePage";

export default function Profile() {
  const [params] = useSearchParams();

  return (
    <main>
      <Title>Crystal</Title>
      <ProfilePage handle={params.handle as string} />
    </main>
  );
}
