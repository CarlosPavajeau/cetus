import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { CopyButton } from "~/components/CopyButton";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { memberRoleLabel } from "~/features/admin/labels";
import { formatDateTime } from "~/features/api-keys/formats";
import { InviteMember } from "~/features/members/InviteMember";
import { assignableRoleItems } from "~/features/members/labels";
import { membersQuery } from "~/features/members/queries";
import {
  type Invitation,
  type Member,
  type MemberResult,
  type ResendResult,
  cancelInvitation,
  removeMember,
  resendInvitation,
  updateMemberRole,
} from "~/features/members/server";
import { useImpersonation } from "~/features/session/useImpersonation";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import { type AssignableMemberRole, assignableMemberRoles } from "~/lib/auth/permissions";

/** Who works in the organization, with which role, and who was invited. */
export const Route = createFileRoute("/_app/settings/members")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.query({ ...membersQuery, staleTime: "static" });
    return { crumb: "Miembros" };
  },
  component: Members,
});

function roleLabel(role: string) {
  return role
    .split(",")
    .map((part) => memberRoleLabel[part.trim()] ?? part)
    .join(", ");
}

function assignable(role: string): AssignableMemberRole | null {
  return assignableMemberRoles.find((value) => value === role) ?? null;
}

/** A change to the members whose refusal shows on the page; the list is read again either way. */
function useMemberChange<T, R extends MemberResult | ResendResult>(
  call: (input: { data: T }) => Promise<R>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSettled: () => queryClient.invalidateQueries({ queryKey: membersQuery.queryKey }),
  });
}

function Members() {
  const { data } = useSuspenseQuery(membersQuery);
  const impersonating = Boolean(useImpersonation());
  const { manage } = useMemberPermissions();
  const editable = manage && !impersonating;

  return (
    <>
      <PageHeader
        title="Miembros"
        count={data.members.length}
        lead="Las personas que trabajan en esta organización. Cada una entra con su propio usuario y su rol decide qué puede cambiar."
        action={editable ? <InviteMember /> : undefined}
      />
      {impersonating ? (
        <Alert>
          <AlertTitle>No disponible durante la sesión de soporte</AlertTitle>
          <AlertDescription>
            Los miembros solo los gestiona la persona de la cuenta.
          </AlertDescription>
        </Alert>
      ) : (
        !manage && (
          <Alert>
            <AlertTitle>Solo lectura</AlertTitle>
            <AlertDescription>
              Los miembros los invitan y gestionan los dueños y administradores de la organización.
            </AlertDescription>
          </Alert>
        )
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="px-5">Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead className="w-56">Rol</TableHead>
              <TableHead className="w-24 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members.map((member) => (
              <MemberRow key={member.id} member={member} editable={editable} />
            ))}
          </TableBody>
        </Table>
      </div>

      {data.invitations.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Invitaciones pendientes">
          <h2 className="text-sm font-medium">Invitaciones pendientes</h2>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-5">Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="w-64 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invitations.map((invitation) => (
                  <InvitationRow key={invitation.id} invitation={invitation} editable={editable} />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </>
  );
}

function MemberRow({ member, editable }: { member: Member; editable: boolean }) {
  const role = assignable(member.role);
  // Owners and the person themselves keep their role: Better Auth would refuse leaving no owner.
  const changeable = editable && !member.self && role !== null;
  const update = useMemberChange(updateMemberRole);
  const failure = update.data && !update.data.ok ? update.data.message : null;

  return (
    <TableRow>
      <TableCell className="px-5 text-xs font-medium">
        {member.name}
        {member.self && <span className="text-muted-foreground"> (tú)</span>}
      </TableCell>
      <TableCell className="text-xs">{member.email}</TableCell>
      <TableCell className="text-xs">
        {changeable && role ? (
          <Select
            items={assignableRoleItems}
            value={role}
            disabled={update.isPending}
            onValueChange={(value) => {
              const next = value === null ? null : assignable(value);
              if (next) {
                update.mutate({ data: { memberId: member.id, role: next } });
              }
            }}
          >
            <SelectTrigger size="sm" className="w-44" aria-label={`Rol de ${member.name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {assignableRoleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          roleLabel(member.role)
        )}
        {failure && <p className="mt-1 text-2xs text-destructive">{failure}</p>}
      </TableCell>
      <TableCell className="pr-5 text-right">
        {changeable && <RemoveMember member={member} />}
      </TableCell>
    </TableRow>
  );
}

function RemoveMember({ member }: { member: Member }) {
  const [open, setOpen] = useState(false);
  const remove = useMemberChange(removeMember);
  const failure = remove.data && !remove.data.ok ? remove.data.message : null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          remove.reset();
        }
      }}
    >
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>Quitar</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quitar a {member.name} de la organización?</AlertDialogTitle>
          <AlertDialogDescription>
            Pierde el acceso a la consola de esta organización en su siguiente página. Lo que hizo
            queda en la actividad.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(
                { data: { memberId: member.id } },
                { onSuccess: (result) => result.ok && setOpen(false) },
              )
            }
          >
            {remove.isPending && <Spinner data-icon="inline-start" />}
            Quitar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InvitationRow({ invitation, editable }: { invitation: Invitation; editable: boolean }) {
  const cancel = useMemberChange(cancelInvitation);
  const resend = useMemberChange(resendInvitation);
  const failure =
    cancel.data && !cancel.data.ok
      ? cancel.data.message
      : resend.data && !resend.data.ok
        ? resend.data.message
        : resend.data?.ok && !resend.data.emailed
          ? "No pudimos enviar el correo. Comparte el enlace o inténtalo en un momento."
          : null;
  const resent = resend.data?.ok && resend.data.emailed;

  return (
    <TableRow>
      <TableCell className="px-5 text-xs font-medium">
        {invitation.email}
        {failure && <p className="mt-1 text-2xs font-normal text-destructive">{failure}</p>}
        {resent && (
          <p className="mt-1 text-2xs font-normal text-muted-foreground">Invitación reenviada.</p>
        )}
      </TableCell>
      <TableCell className="text-xs">{roleLabel(invitation.role)}</TableCell>
      <TableCell className="text-xs tabular-nums">
        {formatDateTime(new Date(invitation.expiresAt))}
      </TableCell>
      <TableCell className="pr-5">
        {editable && (
          <div className="flex items-center justify-end gap-1">
            <CopyButton
              value={invitation.url}
              label={`Copiar enlace de ${invitation.email}`}
              iconOnly
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={resend.isPending}
              onClick={() => resend.mutate({ data: { invitationId: invitation.id } })}
            >
              {resend.isPending && <Spinner data-icon="inline-start" />}
              Reenviar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate({ data: { invitationId: invitation.id } })}
            >
              Cancelar
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
