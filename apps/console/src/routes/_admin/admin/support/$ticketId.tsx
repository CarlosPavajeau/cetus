import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowUpRightIcon, FileIcon } from "lucide-react";

import { Entry, Section } from "~/components/DetailSection";
import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { accountStatusLabel, memberRoleLabel } from "~/features/admin/labels";
import { adminKey, adminSupportTicketQuery } from "~/features/admin/queries";
import { changeSupportTicketStatus } from "~/features/admin/support";
import { dayFormat, timeFormat } from "~/features/audit-log/labels";
import { documentStatusLabel, documentTypeLabel } from "~/features/documents/labels";
import { issuerName, statusLabel as issuerStatusLabel } from "~/features/issuers/labels";
import { priorityLabel, statusLabel } from "~/features/support/labels";
import { ticketStatuses } from "~/features/support/schema";
import type { AdminSupportTicketDetail, SupportTicketStatus } from "~/lib/api/types";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_admin/admin/support/$ticketId")({
  loader: async ({ context: { queryClient }, params }) => {
    const ticket = await queryClient.query({
      ...adminSupportTicketQuery(params.ticketId),
      staleTime: "static",
    });
    if (!ticket) {
      throw notFound();
    }
    return { crumb: `Caso #${ticket.number}` };
  },
  component: TicketDetail,
  notFoundComponent: () => (
    <p className="text-sm text-muted-foreground">No existe un caso con ese identificador.</p>
  ),
});

function dateTime(value: string) {
  const date = new Date(value);
  return `${dayFormat.format(date)}, ${timeFormat.format(date)}`;
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const statusItems = ticketStatuses.map((status) => ({ value: status, label: statusLabel[status] }));

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const { data: ticket } = useSuspenseQuery(adminSupportTicketQuery(ticketId));
  if (!ticket) {
    throw notFound();
  }
  const { context } = ticket;

  return (
    <>
      <PageHeader
        title={`Caso #${ticket.number}`}
        status={
          <Badge variant={ticket.priority === "CRITICAL" ? "destructive" : "secondary"}>
            Prioridad {priorityLabel[ticket.priority].toLowerCase()}
          </Badge>
        }
        lead={`${ticket.userEmail} · ${ticket.accountName} · ${dateTime(ticket.createdAt)}`}
        action={<StatusSelect ticket={ticket} />}
      />

      <Section
        id="ticket-message"
        title="Mensaje"
        action={
          <a
            href={`mailto:${ticket.userEmail}?subject=${encodeURIComponent(`Re: [Soporte #${ticket.number}]`)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Responder por correo
          </a>
        }
      >
        <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
        {ticket.attachments.length > 0 && (
          <ul className="flex flex-col gap-1.5" aria-label="Adjuntos">
            {ticket.attachments.map((attachment) => (
              <li key={attachment.id}>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs hover:underline hover:underline-offset-4"
                >
                  <FileIcon className="size-4 text-muted-foreground" aria-hidden />
                  {attachment.fileName}
                  <span className="text-muted-foreground">{sizeLabel(attachment.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="ticket-account" title="Cuenta al abrir el caso">
        <dl className="grid gap-4 sm:grid-cols-5">
          <Entry label="Organización">
            <Link
              to="/admin/organizations/$accountId"
              params={{ accountId: context.account.id }}
              className="hover:underline hover:underline-offset-4"
            >
              {context.account.name}
            </Link>
          </Entry>
          <Entry label="Estado y plan">
            {accountStatusLabel[context.account.status]} · {context.account.plan}
          </Entry>
          <Entry label="Rol de quien escribe">
            {context.organizationRoles.map((role) => memberRoleLabel[role] ?? role).join(", ") ||
              "Sin rol"}
          </Entry>
          <Entry label="Página">{context.page ? <code>{context.page}</code> : "Sin página"}</Entry>
          <Entry label="Ambiente">
            {context.environment ? (
              <EnvironmentBadge environment={context.environment} />
            ) : (
              "Sin ambiente"
            )}
          </Entry>
        </dl>
      </Section>

      {context.issuer ? (
        <IssuerSnapshot ticket={ticket} />
      ) : (
        <p className="text-sm text-muted-foreground">El caso no nombra un emisor.</p>
      )}
    </>
  );
}

function IssuerSnapshot({ ticket }: { ticket: AdminSupportTicketDetail }) {
  const { issuer, recentFailures } = ticket.context;
  if (!issuer) {
    return null;
  }
  return (
    <Section
      id="ticket-issuer"
      title={`Emisor: ${issuerName(issuer)}`}
      action={
        <Link
          to="/admin/organizations/$accountId/issuers/$issuerId"
          params={{ accountId: ticket.accountId, issuerId: issuer.id }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Ver su estado actual
          <ArrowUpRightIcon data-icon="inline-end" />
        </Link>
      }
    >
      <dl className="grid gap-4 sm:grid-cols-4">
        <Entry label="NIT">
          {issuer.nit}-{issuer.checkDigit}
        </Entry>
        <Entry label="Estado">{issuerStatusLabel[issuer.status]}</Entry>
        <Entry label="Ambiente">
          <EnvironmentBadge environment={issuer.environment} />
        </Entry>
        <Entry label="Software">
          {issuer.software ? <code>{issuer.software.softwareId}</code> : "Sin configurar"}
        </Entry>
        <Entry label="Certificado">
          {issuer.certificate
            ? `Vigente hasta el ${dayFormat.format(new Date(issuer.certificate.validTo))}`
            : "Sin cargar"}
        </Entry>
        <Entry label="Rangos">
          {issuer.ranges.length === 0
            ? "Ninguno"
            : issuer.ranges
                .map(
                  (range) =>
                    `${range.prefix} ${range.from}–${range.to} (${range.status === "ACTIVE" ? "activo" : "inactivo"})`,
                )
                .join(" · ")}
        </Entry>
        {issuer.testSet && (
          <Entry label="Set de pruebas">
            {issuer.testSet.acceptedAt
              ? `Aceptado el ${dayFormat.format(new Date(issuer.testSet.acceptedAt))}`
              : "En curso"}
          </Entry>
        )}
      </dl>
      {recentFailures.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Errores de la DIAN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentFailures.map((failure) => (
              <TableRow key={failure.id}>
                <TableCell className="text-xs">
                  {documentTypeLabel[failure.documentType]} {failure.number}
                  <span className="block text-2xs text-muted-foreground">
                    {dateTime(failure.updatedAt)}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{documentStatusLabel[failure.status]}</TableCell>
                <TableCell className="text-xs whitespace-normal">
                  {failure.dianErrors.join(" · ") || failure.dianStatusMessage || "Sin detalle"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function StatusSelect({ ticket }: { ticket: AdminSupportTicketDetail }) {
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: changeSupportTicketStatus,
    onSuccess: (updated) => {
      queryClient.setQueryData(adminSupportTicketQuery(ticket.id).queryKey, updated);
      return queryClient.invalidateQueries({ queryKey: [...adminKey, "support-tickets"] });
    },
  });

  return (
    <div className="flex flex-col items-end gap-2">
      <Select
        items={statusItems}
        value={ticket.status}
        disabled={change.isPending}
        onValueChange={(value: SupportTicketStatus | null) => {
          if (value && value !== ticket.status) {
            change.mutate({ data: { id: ticket.id, status: value } });
          }
        }}
      >
        <SelectTrigger className="w-40" aria-label="Estado del caso">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {change.isError && (
        <Alert variant="destructive">
          <AlertDescription>No pudimos cambiar el estado. Inténtalo de nuevo.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
