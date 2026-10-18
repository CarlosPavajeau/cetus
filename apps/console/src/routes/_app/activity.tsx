import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HistoryIcon } from "lucide-react";

import { PageHeader } from "~/components/PageHeader";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Field, FieldLabel } from "~/components/ui/field";
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
import { auditLogQuery } from "~/features/audit-log/queries";
import type { ActivityEntry } from "~/features/audit-log/server";
import { type AuditAction, auditActions } from "~/lib/api/types";

type ActivitySearch = { action?: AuditAction };

export const Route = createFileRoute("/_app/activity")({
  validateSearch: (search: Record<string, unknown>): ActivitySearch => ({
    action: auditActions.find((action) => action === search.action),
  }),
  loaderDeps: ({ search }) => ({ action: search.action }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureInfiniteQueryData(auditLogQuery(deps.action)),
  component: Activity,
});

const actionLabel: Record<AuditAction, string> = {
  ACCOUNT_CREATED: "Cuenta creada",
  API_KEY_CREATED: "Llave de API creada",
  API_KEY_REVOKED: "Llave de API revocada",
  ISSUER_CREATED: "Emisor creado",
  SOFTWARE_CREDENTIALS_SET: "Software DIAN configurado",
  CERTIFICATE_UPLOADED: "Certificado cargado",
  NUMBERING_RANGE_ADDED: "Rango de numeración agregado",
  ISSUER_STATUS_CHANGED: "Estado del emisor cambiado",
};

const actionItems: { label: string; value: AuditAction | null }[] = [
  { label: "Todas", value: null },
  ...auditActions.map((value) => ({ label: actionLabel[value], value })),
];

const issuerStatusLabel: Record<string, string> = {
  ONBOARDING: "Configuración pendiente",
  TESTING: "En habilitación",
  ENABLED: "Habilitado",
  DISABLED: "Deshabilitado",
};

const environmentLabel: Record<string, string> = { TEST: "Pruebas", LIVE: "Producción" };

const documentTypeLabel: Record<string, string> = {
  INVOICE: "Factura",
  CREDIT_NOTE: "Nota crédito",
  DEBIT_NOTE: "Nota débito",
};

const personTypeLabel: Record<string, string> = {
  LEGAL_ENTITY: "Persona jurídica",
  NATURAL_PERSON: "Persona natural",
};

const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function label(labels: Record<string, string>, value: unknown): string {
  return labels[text(value)] ?? text(value);
}

function detail(entry: ActivityEntry): string {
  const data = entry.data;
  switch (entry.action) {
    case "ACCOUNT_CREATED":
      return text(data.name);
    case "API_KEY_CREATED":
    case "API_KEY_REVOKED":
      return `${text(data.name)} · ${text(data.prefix)}… · ${label(environmentLabel, data.environment)}`;
    case "ISSUER_CREATED":
      return `NIT ${text(data.nit)} · ${label(environmentLabel, data.environment)} · ${label(personTypeLabel, data.personType)}`;
    case "SOFTWARE_CREDENTIALS_SET":
      return `Software ${text(data.softwareId)}${data.hasTestSet ? " · con set de pruebas" : ""}`;
    case "CERTIFICATE_UPLOADED":
      return data.validTo
        ? `${text(data.subject)} · vence el ${dayFormat.format(new Date(text(data.validTo)))}`
        : text(data.subject);
    case "NUMBERING_RANGE_ADDED":
      return `${label(documentTypeLabel, data.documentType)} ${text(data.prefix)}${text(data.from)} a ${text(data.prefix)}${text(data.to)}`;
    case "ISSUER_STATUS_CHANGED":
      return `${label(issuerStatusLabel, data.from)} → ${label(issuerStatusLabel, data.to)}`;
  }
}

function actor(entry: ActivityEntry): string {
  switch (entry.actorType) {
    case "USER":
      return entry.actorEmail ?? "Usuario eliminado";
    case "API_KEY":
      return "Llave de API";
    case "SYSTEM":
      return "Cetus";
  }
}

function Activity() {
  const { action } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Each filter is its own query, so the pages appended with "Ver más" never mix across filters.
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    auditLogQuery(action),
  );
  const entries = data.pages.flatMap((page) => page.items);

  return (
    <>
      <PageHeader
        title="Actividad"
        lead="Cambios sensibles en la cuenta: quién los hizo y cuándo. El registro es permanente y no se puede editar."
      />

      <Card>
        <CardHeader>
          <CardTitle>Registro</CardTitle>
          <CardAction>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="activity-action" className="whitespace-nowrap">
                Tipo de acción
              </FieldLabel>
              <Select
                items={actionItems}
                value={action ?? null}
                onValueChange={(value) => navigate({ search: { action: value ?? undefined } })}
              >
                <SelectTrigger id="activity-action" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {actionItems.map((item) => (
                      <SelectItem key={item.label} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </CardAction>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HistoryIcon />
                </EmptyMedia>
                <EmptyTitle>Sin actividad</EmptyTitle>
                <EmptyDescription>
                  {action
                    ? "No hay actividad de este tipo."
                    : "Todavía no hay actividad registrada."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Quién</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="tabular-nums">
                      {dateFormat.format(new Date(entry.createdAt))}
                    </TableCell>
                    <TableCell>{actionLabel[entry.action]}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{actor(entry)}</span>
                        {entry.ipAddress && (
                          <span className="text-xs text-muted-foreground">{entry.ipAddress}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">{detail(entry)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {hasNextPage && (
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage && <Spinner data-icon="inline-start" />}
              {isFetchingNextPage ? "Cargando…" : "Ver más"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
