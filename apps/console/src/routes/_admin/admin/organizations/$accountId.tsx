import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { Entry, Section } from "~/components/DetailSection";
import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { AccountPlanDialog } from "~/features/admin/AccountPlanDialog";
import { AccountStatusDialog } from "~/features/admin/AccountStatusDialog";
import { accountStatusLabel, memberRoleLabel } from "~/features/admin/labels";
import { adminAccountQuery } from "~/features/admin/queries";
import { dayFormat, timeFormat } from "~/features/audit-log/labels";
import { documentStatusLabel, documentTypeLabel } from "~/features/documents/labels";
import { issuerName, statusLabel } from "~/features/issuers/labels";
import { planPrice, planTitle } from "~/features/usage/labels";
import { PeriodUsageSummary } from "~/features/usage/PeriodUsageSummary";
import { entryOf } from "~/lib/utils";

export const Route = createFileRoute("/_admin/admin/organizations/$accountId")({
  loader: async ({ context: { queryClient }, params }) => {
    const account = await queryClient.ensureQueryData(adminAccountQuery(params.accountId));
    if (!account) {
      throw notFound();
    }
    return { crumb: account.name };
  },
  component: AccountDetail,
  notFoundComponent: () => (
    <p className="text-sm text-muted-foreground">No existe una cuenta con ese identificador.</p>
  ),
});

function dateTime(value: string) {
  const date = new Date(value);
  return `${dayFormat.format(date)}, ${timeFormat.format(date)}`;
}

function AccountDetail() {
  const { accountId } = Route.useParams();
  const { platformRole } = Route.useRouteContext();
  const account = useSuspenseQuery(adminAccountQuery(accountId)).data!;
  const isAdmin = platformRole === "admin";

  return (
    <>
      <PageHeader
        title={account.name}
        status={
          <Badge variant={account.status === "ACTIVE" ? "secondary" : "destructive"}>
            {entryOf(accountStatusLabel, account.status) ?? account.status}
          </Badge>
        }
        lead={`${planTitle(account.billableThisMonth.plan)} · creada el ${dayFormat.format(new Date(account.createdAt))}`}
        action={
          isAdmin && account.status !== "CLOSED" ? (
            <div className="flex gap-2">
              <AccountPlanDialog
                accountId={account.id}
                accountName={account.name}
                plan={account.plan}
              />
              <AccountStatusDialog
                accountId={account.id}
                accountName={account.name}
                action={account.status === "ACTIVE" ? "suspend" : "reactivate"}
              />
            </div>
          ) : undefined
        }
      />

      {account.status !== "ACTIVE" && account.statusReason && (
        <Alert variant="destructive">
          <AlertTitle>
            Cuenta {entryOf(accountStatusLabel, account.status)?.toLowerCase()}
          </AlertTitle>
          <AlertDescription>
            {account.statusReason}
            {account.statusChangedAt &&
              ` · ${dateTime(account.statusChangedAt)} por ${account.statusChangedByEmail ?? "el equipo de Cetus"}`}
          </AlertDescription>
        </Alert>
      )}

      <Section id="account-ids" title="Identificadores">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Entry label="Cuenta">
            <code>{account.id}</code>
          </Entry>
          <Entry label="Organización (Better Auth)">
            <code>{account.organizationId}</code>
          </Entry>
          <Entry label="Último cambio de estado">
            {account.statusChangedAt
              ? `${dateTime(account.statusChangedAt)} · ${account.statusReason ?? ""}`
              : "Nunca"}
          </Entry>
        </dl>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="account-members" title={`Miembros (${account.members.length})`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {account.members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: member.userId }}
                        className="w-fit text-xs hover:underline hover:underline-offset-4"
                      >
                        {member.name || member.email}
                      </Link>
                      <span className="text-2xs text-muted-foreground">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {memberRoleLabel[member.role] ?? member.role}
                    {member.banned && (
                      <Badge variant="destructive" className="ml-2">
                        Bloqueado
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section id="account-issuers" title={`Emisores (${account.issuers.length})`}>
          {account.issuers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no configura ningún emisor.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emisor</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.issuers.map((issuer) => (
                  <TableRow key={issuer.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Link
                          to="/admin/organizations/$accountId/issuers/$issuerId"
                          params={{ accountId: account.id, issuerId: issuer.id }}
                          className="w-fit text-xs hover:underline hover:underline-offset-4"
                        >
                          {issuerName(issuer)}
                        </Link>
                        <span className="text-2xs text-muted-foreground">
                          NIT {issuer.nit}-{issuer.checkDigit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <EnvironmentBadge environment={issuer.environment} />
                    </TableCell>
                    <TableCell className="text-xs">{statusLabel[issuer.status]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>

      <Section
        id="account-billing"
        title={`${planTitle(account.billableThisMonth.plan)} · ${planPrice(account.billableThisMonth.plan)}`}
      >
        <PeriodUsageSummary usage={account.billableThisMonth} />
      </Section>

      <Section id="account-usage" title="Documentos creados este mes">
        {account.usageThisMonth.length === 0 ? (
          <p className="text-xs text-muted-foreground">No ha creado documentos este mes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ambiente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {account.usageThisMonth.map((usage) => (
                <TableRow key={`${usage.environment}-${usage.documentType}-${usage.status}`}>
                  <TableCell>
                    <EnvironmentBadge environment={usage.environment} />
                  </TableCell>
                  <TableCell className="text-xs">{documentTypeLabel[usage.documentType]}</TableCell>
                  <TableCell className="text-xs">
                    {entryOf(documentStatusLabel, usage.status) ?? usage.status}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{usage.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section id="account-failures" title="Rechazos y fallas recientes">
        {account.recentFailures.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin rechazos ni fallas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Respuesta de la DIAN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {account.recentFailures.map((failure) => (
                <TableRow key={failure.id}>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs">
                        {documentTypeLabel[failure.documentType]} {failure.number}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        {dateTime(failure.updatedAt)}
                      </span>
                      <EnvironmentBadge environment={failure.environment} />
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    {entryOf(documentStatusLabel, failure.status) ?? failure.status}
                    {failure.dianStatusCode && (
                      <span className="block text-2xs text-muted-foreground">
                        Código {failure.dianStatusCode}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <ul className="flex flex-col gap-1 text-2xs">
                      {failure.dianErrors.length > 0 ? (
                        failure.dianErrors.map((error) => <li key={error}>{error}</li>)
                      ) : (
                        <li>{failure.dianStatusMessage ?? "Sin detalle"}</li>
                      )}
                    </ul>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Link
        to="/admin/audit-log"
        search={{ accountId: account.id }}
        className="w-fit text-xs font-medium text-primary underline-offset-4 hover:underline"
      >
        Ver el registro de auditoría de esta cuenta
      </Link>
    </>
  );
}
