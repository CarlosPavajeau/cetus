import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import { signUpUrl } from "~/lib/site";

/** The end of a guide: where to try what it explains, in the console. MDX passes its text as a paragraph. */
export function SignUpCta({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="not-prose my-6 flex flex-col gap-3 rounded-lg border bg-fd-card p-5">
      <p className="m-0 font-medium">{title}</p>
      <div className="text-sm text-fd-muted-foreground [&>p]:m-0">{children}</div>
      <a
        href={signUpUrl}
        className="inline-flex w-fit items-center gap-1.5 rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground"
      >
        Crear cuenta gratis
        <ArrowRightIcon className="size-4" />
      </a>
    </div>
  );
}
