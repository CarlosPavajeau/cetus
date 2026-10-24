import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { memberRoleLabel } from "~/features/admin/labels";
import { createWorkspace } from "~/features/auth/workspace";
import { listWorkplaces } from "~/features/members/server";
import { requireSession } from "~/features/session/guard";
import { authClient } from "~/lib/auth/client";

/**
 * Where someone signed in without an organization lands: just signed up from an invitation, or removed from
 * the only one they had. They join one they were invited to, or create their own.
 */
export const Route = createFileRoute("/organizations")({
  beforeLoad: async () => {
    const { session } = await requireSession();
    if (session.activeOrganizationId && session.memberRoles.length > 0) {
      throw redirect({ to: "/overview" });
    }
    return { session };
  },
  loader: () => listWorkplaces(),
  component: Organizations,
});

function Organizations() {
  const { organizations, invitations } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const enter = useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.setActive({ organizationId });
      if (error) {
        throw new Error("No pudimos abrir esa organización. Inténtalo de nuevo.");
      }
    },
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: "/overview" });
    },
  });

  return (
    <AuthLayout
      title="Elige dónde trabajar"
      lead="Tu usuario todavía no está en ninguna organización. Únete a la que te invitó o crea la tuya."
    >
      <div className="flex flex-col gap-6">
        {organizations.length > 0 && (
          <section className="flex flex-col gap-2" aria-label="Tus organizaciones">
            <h2 className="text-sm font-medium">Tus organizaciones</h2>
            {organizations.map((organization) => (
              <div
                key={organization.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span className="truncate text-sm font-medium">{organization.name}</span>
                <Button
                  size="sm"
                  disabled={enter.isPending}
                  onClick={() => enter.mutate(organization.id)}
                >
                  Entrar
                </Button>
              </div>
            ))}
            {enter.error && <p className="text-xs text-destructive">{enter.error.message}</p>}
          </section>
        )}
        {invitations.status === "unverified" ? (
          <ConfirmToSeeInvitations email={invitations.email} />
        ) : (
          invitations.invitations.length > 0 && (
            <section className="flex flex-col gap-2" aria-label="Tus invitaciones">
              <h2 className="text-sm font-medium">Tus invitaciones</h2>
              {invitations.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {invitation.organizationName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {memberRoleLabel[invitation.role] ?? invitation.role}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    render={
                      <Link
                        to="/invitations/$invitationId"
                        params={{ invitationId: invitation.id }}
                      />
                    }
                    nativeButton={false}
                  >
                    Ver invitación
                  </Button>
                </div>
              ))}
            </section>
          )
        )}
        <CreateWorkspace defaultName={session.user.name} />
      </div>
    </AuthLayout>
  );
}

function ConfirmToSeeInvitations({ email }: { email: string }) {
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/organizations",
      });
      if (error) {
        throw new Error("No pudimos enviar el correo. Inténtalo de nuevo en un momento.");
      }
    },
  });

  return (
    <Alert>
      <AlertDescription className="flex flex-col items-start gap-3">
        {send.isSuccess
          ? `Te enviamos el enlace a ${email}. Ábrelo en este navegador para ver tus invitaciones.`
          : `Si te invitaron a una organización, confirma primero que ${email} es tuyo para verla.`}
        {send.error && <span className="text-destructive">{send.error.message}</span>}
        <Button size="sm" variant="outline" disabled={send.isPending} onClick={() => send.mutate()}>
          {send.isPending && <Spinner data-icon="inline-start" />}
          {send.isSuccess ? "Reenviar el correo" : "Enviar el correo de confirmación"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function CreateWorkspace({ defaultName }: { defaultName: string }) {
  const id = useId();
  const [name, setName] = useState(defaultName);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: async () => {
      if (!(await createWorkspace(name.trim()))) {
        throw new Error("No pudimos crear la organización. Inténtalo de nuevo.");
      }
    },
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: "/overview" });
    },
  });

  return (
    <form
      className="flex flex-col gap-3"
      aria-label="Crear mi organización"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) {
          create.mutate();
        }
      }}
    >
      <Field>
        <FieldLabel htmlFor={id}>Nombre de tu organización</FieldLabel>
        <Input
          id={id}
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          className="h-11 px-3"
        />
      </Field>
      {create.error && (
        <Alert variant="destructive">
          <AlertDescription>{create.error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        size="lg"
        variant="outline"
        className="h-11"
        disabled={create.isPending || !name.trim()}
      >
        {create.isPending && <Spinner data-icon="inline-start" />}
        Crear mi organización
      </Button>
    </form>
  );
}
