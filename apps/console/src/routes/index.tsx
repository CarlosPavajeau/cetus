import { createFileRoute, redirect } from "@tanstack/react-router";

import { getSession } from "~/features/session/server";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    throw redirect({ to: session ? "/overview" : "/sign-in" });
  },
});
