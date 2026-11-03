import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowRightIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";

import type { Audience } from "./links";
import { visitorSessionQuery } from "./queries";

/** "Crear cuenta" for a visitor, "Ir a la consola" once the browser finds a session. */
export function ConsoleCta({
  audience,
  label,
  size = "lg",
}: {
  audience?: Audience;
  label: string;
  size?: "default" | "lg";
}) {
  const { data: session } = useQuery(visitorSessionQuery);

  if (session) {
    return (
      <Link to="/overview" className={buttonVariants({ size })}>
        Ir a la consola
        <ArrowRightIcon data-icon="inline-end" />
      </Link>
    );
  }
  return (
    <Link to="/sign-up" search={audience && { audience }} className={buttonVariants({ size })}>
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
    <Link to="/sign-in" className={cn(buttonVariants({ variant: "ghost" }), "max-sm:hidden")}>
      Iniciar sesión
    </Link>
  );
}
