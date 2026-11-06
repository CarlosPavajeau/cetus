import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { memberRoleLabel } from "~/features/admin/labels";
import { getInvitationDetails } from "~/features/members/server";
import { authClient } from "~/lib/auth/client";
import { cn } from "~/lib/utils";

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
        title={
          invitation.organizationName
            ? `Te invitaron a ${invitation.organizationName}`
            : "Te invitaron a Cetus"
        }
        lead="Entra con el correo al que llegó la invitación, o crea tu cuenta con él, para unirte."
      >
        <div className="flex flex-col gap-3">
          <Link
            to="/sign-up"
            search={{ invitation: invitationId }}
            className={cn(buttonVariants({ size: "xl" }))}
          >
            Crear cuenta
          </Link>
          <Link
            to="/sign-in"
            search={{ invitation: invitationId }}
            className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
          >
            Ya tengo cuenta
          </Link>
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
          <Link
            to="/organizations"
            className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
          >
            Ir a la consola
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (invitation.status === "other-recipient") {
    return <OtherRecipient email={invitation.email} />;
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
        <Button size="xl" disabled={accept.isPending} onClick={() => accept.mutate()}>
          {accept.isPending && <Spinner data-icon="inline-start" />}
          Unirme
        </Button>
      </div>
    </AuthLayout>
  );
}

/** Signing out brings the invitation back without a session, where the invited address can enter. */
function OtherRecipient({ email }: { email: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut();
      if (error) {
        throw new Error("No pudimos cerrar la sesión. Inténtalo de nuevo en un momento.");
      }
    },
    onSuccess: async () => {
      queryClient.clear();
      await router.invalidate();
    },
  });

  return (
    <AuthLayout
      title="Invitación no válida"
      lead={`Esta invitación es para otro correo y entraste como ${email}.`}
    >
      <div className="flex flex-col gap-4">
        {signOut.error && (
          <Alert variant="destructive">
            <AlertDescription>{signOut.error.message}</AlertDescription>
          </Alert>
        )}
        <Button size="xl" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
          {signOut.isPending && <Spinner data-icon="inline-start" />}
          Cerrar sesión y usar el correo invitado
        </Button>
        <Link
          to="/organizations"
          className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
        >
          Seguir como {email}
        </Link>
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
          size="xl"
          variant={send.isSuccess || sent ? "outline" : "default"}
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
