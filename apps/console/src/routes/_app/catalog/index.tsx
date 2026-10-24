import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/catalog/")({
  beforeLoad: () => {
    throw redirect({ to: "/catalog/customers" });
  },
});
