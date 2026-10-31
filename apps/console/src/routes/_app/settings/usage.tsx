import { createFileRoute, redirect } from "@tanstack/react-router";

/** "Plan y uso" became the billing page; older links and emails still point here. */
export const Route = createFileRoute("/_app/settings/usage")({
  beforeLoad: () => {
    throw redirect({ to: "/billing", replace: true });
  },
});
