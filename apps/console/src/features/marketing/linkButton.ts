import { cn } from "cn";

import { buttonVariants } from "~/components/ui/button";

/**
 * A link styled as a button. The button's press scale is gated by `:enabled`, which never matches an `<a>`, so
 * the links take it here.
 */
export function linkButtonVariants(options?: Parameters<typeof buttonVariants>[0]) {
  return cn(buttonVariants(options), "motion-safe:active:scale-96");
}
