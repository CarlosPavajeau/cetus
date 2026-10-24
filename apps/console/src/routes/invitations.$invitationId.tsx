import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { memberRoleLabel } from "~/features/admin/labels";
import { getInvitationDetails } from "~/features/members/server";
import { authClient } from "~/lib/auth/client";

/**
 * Where an invited person joins the organization. Better Auth only shows the invitation to its address,
 * signed in, so someone without a session is sent to sign in or to create their account first.
 */
export const Route = createFileRoute("/invitations/$invitationId")({
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
        <Alert>
          <AlertDescription>{invitation.message}</AlertDescription>
        </Alert>
      </AuthLayout>
    );
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
