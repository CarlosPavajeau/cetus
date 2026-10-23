import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2Icon } from "lucide-react";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { categoriesTitle } from "~/features/contacts/labels";
import { confirmContactVerification, getContactVerification } from "~/features/contacts/server";

/**
 * Where a new contact confirms their address from the link Cetus emailed. No account needed: the link is
 * the credential. Opening it changes nothing, so a mail scanner that follows links cannot confirm it.
 */
export const Route = createFileRoute("/contact-verification/$token")({
  loader: ({ params }) => getContactVerification({ data: { token: params.token } }),
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  component: ContactVerification,
});

function ContactVerification() {
  const verification = Route.useLoaderData();
  const { token } = Route.useParams();
  const confirm = useMutation({ mutationFn: confirmContactVerification });

  if (!verification) {
    return (
      <AuthLayout title="Enlace no válido" lead="Este enlace de verificación ya no sirve.">
        <Alert>
          <AlertDescription>
            Venció, ya se usó o se pidió uno más reciente. Pide a quien te agregó como contacto que
            lo reenvíe desde la consola.
          </AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  const what = `los avisos ${categoriesTitle(verification.categories)} de ${verification.accountName}`;
  if (confirm.isSuccess) {
    return (
      <AuthLayout title="Correo verificado" lead={`${verification.email} recibirá ${what}.`}>
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>Listo</AlertTitle>
          <AlertDescription>Ya puedes cerrar esta página.</AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Confirma tu correo"
      lead={`Confirma que ${verification.email} debe recibir ${what} en Cetus.`}
    >
      <div className="flex flex-col gap-4">
        {confirm.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {confirm.error instanceof Error
                ? confirm.error.message
                : "No pudimos confirmarlo. Inténtalo de nuevo."}
            </AlertDescription>
          </Alert>
        )}
        <Button
          size="lg"
          className="h-11"
          disabled={confirm.isPending}
          onClick={() => confirm.mutate({ data: { token } })}
        >
          {confirm.isPending && <Spinner data-icon="inline-start" />}
          Confirmar el correo
        </Button>
        <p className="text-2xs text-muted-foreground">
          Si no esperabas este correo, cierra esta página: no recibirás avisos.
        </p>
      </div>
    </AuthLayout>
  );
}
