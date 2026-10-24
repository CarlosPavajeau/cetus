import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { memberRoleLabel } from "~/features/admin/labels";
import { getInvitationDetails } from "~/features/members/server";
import { authClient } from "~/lib/auth/client";

type InvitationSearch = {
  /** The sign-up just sent the confirmation email. */
  sent?: true;
  /** Why Better Auth could not confirm the address, when its link sends the person back here. */
  error?: string;
};

const verificationErrors: Record<string, string> = {
  TOKEN_EXPIRED: "El enlace de confirmación venció. Pide otro.",
  INVALID_TOKEN: "El enlace de confirmación no es válido. Pide otro.",
  INVALID_USER: "Ese enlace confirma otro correo: entra con la cuenta a la que llegó.",
};

/**
 * Where an invited person joins the organization. Better Auth only shows the invitation to its address,
 * signed in and confirmed, so someone without a session is sent to sign in or to create their account, and
 * someone who has not confirmed their address is asked to.
 */
export const Route = createFileRoute("/invitations/$invitationId")({
  validateSearch: (search): InvitationSearch => ({
    ...(search.sent === true || search.sent === "true" ? { sent: true as const } : {}),
    ...(typeof search.error === "string" && search.error ? { error: search.error } : {}),
  }),
  loader: ({ params }) => getInvitationDetails({ data: { id: params.invitationId } }),
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  component: InvitationPage,
});

function InvitationPage() {
  const invitation = Route.useLoaderData();
  const { invitationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.acceptInvitation({ invitationId });
      if (error) {
        throw new Error(
          "No pudimos unirte a la organización. Pide a quien te invitó un enlace nuevo.",
        );
      }
    },
    onSuccess: async () => {
      // Accepting makes the organization active; nothing cached belongs to it.
      queryClient.clear();
      await navigate({ to: "/overview" });
    },
  });

  if (invitation.status === "signed-out") {
    return (
      <AuthLayout
        title="Te invitaron a Cetus"
        lead="Entra con el correo al que llegó la invitación, o crea tu cuenta con él, para unirte a la organización."
      >
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="h-11"
            render={<Link to="/sign-up" search={{ invitation: invitationId }} />}
            nativeButton={false}
          >
            Crear cuenta
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11"
            render={<Link to="/sign-in" search={{ invitation: invitationId }} />}
            nativeButton={false}
          >
            Ya tengo cuenta
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (invitation.status === "invalid") {
    return (
      <AuthLayout title="Invitación no válida" lead="Este enlace de invitación no sirve.">
        <div className="flex flex-col gap-4">
          <Alert>
            <AlertDescription>{invitation.message}</AlertDescription>
          </Alert>
          <Button variant="outline" render={<Link to="/overview" />} nativeButton={false}>
            Ir a la consola
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (invitation.status === "unverified") {
    return <ConfirmAddress invitationId={invitationId} email={invitation.email} />;
  }

  const role = memberRoleLabel[invitation.role] ?? invitation.role;
  return (
    <AuthLayout
      title={`Únete a ${invitation.organizationName}`}
      lead={`${invitation.inviterEmail} te invitó como ${role.toLowerCase()}.`}
    >
      <div className="flex flex-col gap-4">
        {accept.error && (
          <Alert variant="destructive">
            <AlertDescription>{accept.error.message}</AlertDescription>
          </Alert>
        )}
        <Button
          size="lg"
          className="h-11"
          disabled={accept.isPending}
          onClick={() => accept.mutate()}
        >
          {accept.isPending && <Spinner data-icon="inline-start" />}
          Unirme
        </Button>
      </div>
    </AuthLayout>
  );
}

/** Asks the invited person to prove the address is theirs; its link brings them back here. */
function ConfirmAddress({ invitationId, email }: { invitationId: string; email: string }) {
  const { sent, error } = Route.useSearch();
  const send = useMutation({
    mutationFn: async () => {
      const { error: sendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: `/invitations/${invitationId}`,
      });
      if (sendError) {
        throw new Error("No pudimos enviar el correo. Inténtalo de nuevo en un momento.");
      }
    },
  });
  const linkError = error ? (verificationErrors[error] ?? verificationErrors.INVALID_TOKEN) : null;

  return (
    <AuthLayout
      title="Confirma tu correo"
      lead={`Para unirte, confirma que ${email} es tuyo con el enlace que te enviamos. Así nadie más puede aceptar esta invitación.`}
    >
      <div className="flex flex-col gap-4">
        {linkError && (
          <Alert variant="destructive">
            <AlertDescription>{linkError}</AlertDescription>
          </Alert>
        )}
        {send.error && (
          <Alert variant="destructive">
            <AlertDescription>{send.error.message}</AlertDescription>
          </Alert>
        )}
        {(send.isSuccess || (sent && !linkError)) && (
          <Alert>
            <AlertDescription>
              Te enviamos el enlace a {email}. Ábrelo en este navegador para volver aquí y unirte.
            </AlertDescription>
          </Alert>
        )}
        <Button
          size="lg"
          variant={send.isSuccess || sent ? "outline" : "default"}
          className="h-11"
          disabled={send.isPending}
          onClick={() => send.mutate()}
        >
          {send.isPending && <Spinner data-icon="inline-start" />}
          {send.isSuccess || sent ? "Reenviar el correo" : "Enviar el correo de confirmación"}
        </Button>
      </div>
    </AuthLayout>
  );
}
