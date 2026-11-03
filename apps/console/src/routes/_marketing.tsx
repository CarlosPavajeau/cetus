import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { MarketingFooter } from "~/features/marketing/MarketingFooter";
import { MarketingNav } from "~/features/marketing/MarketingNav";
import { marketingConfigQuery } from "~/features/marketing/queries";
import { useAnalytics } from "~/features/marketing/useAnalytics";
import { WhatsAppFloat } from "~/features/marketing/WhatsAppButton";

/** The public pages: their own nav and footer, none of the console's shell, open with or without a session. */
export const Route = createFileRoute("/_marketing")({
  loader: ({ context }) =>
    context.queryClient.query({ ...marketingConfigQuery, staleTime: "static" }),
  component: MarketingLayout,
});

function MarketingLayout() {
  const { data: config } = useSuspenseQuery(marketingConfigQuery);
  useAnalytics();

  return (
    <div className="flex min-h-svh flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
      <WhatsAppFloat number={config.whatsappNumber} />
    </div>
  );
}
