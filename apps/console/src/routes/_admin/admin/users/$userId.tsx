import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { Entry, Section } from "~/components/DetailSection";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ImpersonateDialog } from "~/features/admin/ImpersonateDialog";
import { memberRoleLabel } from "~/features/admin/labels";
import { adminUserQuery } from "~/features/admin/queries";
import { BanBadge, PlatformRoleBadge } from "~/features/admin/UserBadges";
import { BanUserDialog, UnbanUserDialog } from "~/features/admin/UserBanDialog";
import { dayFormat } from "~/features/audit-log/labels";

export const Route = createFileRoute("/_admin/admin/users/$userId")({
  loader: async ({ context: { queryClient }, params }) => {
    const person = await queryClient.query({
      ...adminUserQuery(params.userId),
      staleTime: "static",
    });
    if (!person) {
      throw notFound();
    }
    return { crumb: person.email };
  },
  component: UserDetail,
  notFoundComponent: () => (
    <p className="text-sm text-muted-foreground">No existe un usuario con ese identificador.</p>
  ),
});

function UserDetail() {
  const { userId } = Route.useParams();
  const { platformRole } = Route.useRouteContext();
  const person = useSuspenseQuery(adminUserQuery(userId)).data;
  if (!person) {
    throw notFound();
  }
  const banActive = person.banActive;
  // The Cetus team is never banned from here, the acting admin included.
  const canBan = platformRole === "admin" && !person.platformRole && !person.isSelf;
  // Only organizations with a Cetus account can be entered: the console needs one.
  const enterable = person.memberships.filter((membership) => membership.accountId);
  const canImpersonate = canBan && !banActive && enterable.length > 0;

  return (
    <>
      <PageHeader
        title={person.name || person.email}
        status={
          <>
            <BanBadge user={person} />
            <PlatformRoleBadge role={person.platformRole} />
          </>
        }
        lead={person.email}
        action={
          canBan ? (
            <div className="flex flex-wrap gap-2">
              {canImpersonate && <ImpersonateDialog target={person} organizations={enterable} />}
              {banActive ? <UnbanUserDialog target={person} /> : <BanUserDialog target={person} />}
            </div>
          ) : undefined
        }
      />

      {banActive && (
        <Alert variant="destructive">
          <AlertTitle>
            {person.banExpires
              ? `Bloqueado hasta el ${dayFormat.format(new Date(person.banExpires))}`
              : "Bloqueado hasta que se desbloquee"}
          </AlertTitle>
          <AlertDescription>{person.banReason ?? "Sin motivo registrado."}</AlertDescription>
        </Alert>
      )}

      <Section id="user-info" title="Cuenta de usuario">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Entry label="Identificador">
            <code>{person.id}</code>
          </Entry>
          <Entry label="Registro">{dayFormat.format(new Date(person.createdAt))}</Entry>
          <Entry label="Verificación en dos pasos">
            {person.twoFactorEnabled ? "Activa" : "No activa"}
          </Entry>
        </dl>
      </Section>

      <Section id="user-organizations" title={`Organizaciones (${person.memberships.length})`}>
        {person.memberships.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pertenece a ninguna organización.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {person.memberships.map((membership) => (
                <TableRow key={membership.organizationId}>
                  <TableCell className="text-xs">
                    {membership.accountId ? (
                      <Link
                        to="/admin/organizations/$accountId"
                        params={{ accountId: membership.accountId }}
                        className="hover:underline hover:underline-offset-4"
                      >
                        {membership.organizationName}
                      </Link>
                    ) : (
                      `${membership.organizationName} (sin cuenta)`
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {memberRoleLabel[membership.role] ?? membership.role}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </>
  );
}
