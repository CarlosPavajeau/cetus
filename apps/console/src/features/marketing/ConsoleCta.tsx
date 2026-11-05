import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRightIcon } from "lucide-react";

import type { CatalogPeriod } from "~/features/billing/PlanCatalog";

import { type CtaSection, track } from "./analytics";
import { linkButtonVariants } from "./linkButton";
import type { Audience } from "./links";
import { visitorSessionQuery } from "./queries";

type SignedInLink =
  | { to: "/overview"; label: string }
  | { to: "/billing/products"; label: string; periodo?: CatalogPeriod };

const consoleLink: SignedInLink = { to: "/overview", label: "Ir a la consola" };

/** "Crear cuenta" for a visitor, "Ir a la consola" (or `signedIn`) once the browser finds a session. */
export function ConsoleCta({
  audience,
  section,
  label,
  size = "lg",
  variant = "default",
  plan,
  signedIn = consoleLink,
}: {
  audience?: Audience;
  section: CtaSection;
  label: string;
  size?: "default" | "lg";
  variant?: "default" | "outline";
  plan?: string;
  signedIn?: SignedInLink;
}) {
  const { data: session } = useQuery(visitorSessionQuery);

  if (session) {
    const className = linkButtonVariants({ size, variant });
    const content = (
      <>
        {signedIn.label}
        <ArrowRightIcon data-icon="inline-end" />
      </>
    );
    return signedIn.to === "/billing/products" ? (
      <Link
        to="/billing/products"
        search={signedIn.periodo ? { periodo: signedIn.periodo } : {}}
        className={className}
      >
        {content}
      </Link>
    ) : (
      <Link to="/overview" className={className}>
        {content}
      </Link>
    );
  }
  return (
    <Link
      to="/sign-up"
      search={audience && { audience }}
      className={linkButtonVariants({ size, variant })}
      onClick={() => track({ name: "cta_click", audience: audience ?? null, section, plan })}
    >
      {label}
      <ArrowRightIcon data-icon="inline-end" />
    </Link>
  );
}

/** Hidden once the browser finds a session: "Ir a la consola" takes its place. */
export function SignInLink() {
  const { data: session } = useQuery(visitorSessionQuery);

  if (session) {
    return null;
  }
  return (
    <Link to="/sign-in" className={cn(linkButtonVariants({ variant: "ghost" }), "max-md:hidden")}>
      Iniciar sesión
    </Link>
  );
}
