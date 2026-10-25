import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { legalAcceptance, legalDocuments } from "~/features/legal/documents";
import { LegalLink } from "~/features/legal/LegalLink";
import { acceptLegal } from "~/features/legal/server";
import { getSession } from "~/features/session/server";
import { authClient } from "~/lib/auth/client";

/** Only a path of the console itself: anything else could send the person to another site. */
function internalPath(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/overview";
}

/**
 * Where the console sends someone who has not accepted the current version of a legal document. `redirect`:
 * the page they were going to, where they continue once they accept.
 */
export const Route = createFileRoute("/legal/accept")({
  validateSearch: (search: Record<string, unknown>): { redirect: string } => ({
    redirect: internalPath(search.redirect),
  }),
  beforeLoad: async ({ search }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/sign-in" });
    }
    if (session.pendingConsents.length === 0 || session.impersonatedBy) {
      throw redirect({ href: search.redirect });
    }
    return { pending: session.pendingConsents };
  },
  component: AcceptLegal,
});

function AcceptLegal() {
  const { pending } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accepted, setAccepted] = useState(false);
  const [missing, setMissing] = useState(false);
  const accept = useMutation({
    mutationFn: () => acceptLegal({ data: { acceptance: legalAcceptance } }),
    onSuccess: () => navigate({ href: search.redirect }),
  });

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    await navigate({ to: "/sign-in" });
  }

  return (
    <AuthLayout
      title="Actualizamos nuestros documentos"
      lead="Para seguir usando la consola, revisa y acepta la versión vigente."
    >
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!accepted) {
            setMissing(true);
            return;
          }
          accept.mutate();
        }}
      >
        <ul className="flex flex-col gap-2 text-sm">
          {pending.map((document) => (
            <li key={document}>
              <LegalLink document={document}>{legalDocuments[document].title}</LegalLink>
            </li>
          ))}
        </ul>
        <Field orientation="horizontal" data-invalid={missing}>
          <Checkbox
            id="legal-accept"
            checked={accepted}
            onCheckedChange={(checked) => {
              setAccepted(checked);
              setMissing(false);
            }}
            aria-invalid={missing}
            aria-describedby="legal-accept-error"
          />
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="legal-accept" className="block font-normal">
              Leí y acepto los <LegalLink document="terms">términos de servicio</LegalLink> y
              autorizo el tratamiento de mis datos según la{" "}
              <LegalLink document="privacy">política de datos</LegalLink>.
            </FieldLabel>
            <FieldError
              id="legal-accept-error"
              errors={[
                missing
                  ? { message: "Acepta los términos y la política de datos para continuar." }
                  : undefined,
              ]}
            />
          </div>
        </Field>
        {accept.error && (
          <Alert variant="destructive">
            <AlertDescription>{accept.error.message}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" className="h-11" disabled={accept.isPending}>
          {accept.isPending && <Spinner data-icon="inline-start" />}
          Aceptar y continuar
        </Button>
        <Button type="button" variant="ghost" onClick={signOut}>
          Cerrar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}
