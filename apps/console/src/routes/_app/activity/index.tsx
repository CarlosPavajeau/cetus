import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDownIcon, ListFilterIcon } from "lucide-react";

import { PageHeader } from "~/components/PageHeader";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { apiKeysQuery } from "~/features/api-keys/queries";
import { AuditRecordNotice } from "~/features/audit-log/AuditRecordNotice";
import { describeEntry } from "~/features/audit-log/describe";
import { actionLabel, actorTypeLabel, dayFormat, timeFormat } from "~/features/audit-log/labels";
import { auditLogQuery } from "~/features/audit-log/queries";
import type { ActivityEntry } from "~/features/audit-log/server";
import { type AuditAction, auditActions, userAuditActions } from "~/lib/api/types";

type ActivitySearch = { action?: AuditAction };

// Bans are recorded on the person, never on an account.
const accountAuditActions = auditActions.filter(
  (action) => !(userAuditActions as readonly AuditAction[]).includes(action),
);

export const Route = createFileRoute("/_app/activity/")({
  validateSearch: (search: Record<string, unknown>): ActivitySearch => ({
    action: accountAuditActions.find((action) => action === search.action),
  }),
  loaderDeps: ({ search }) => ({ action: search.action }),
  // The key list names the API keys that acted; the log only carries their ids.
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureInfiniteQueryData(auditLogQuery(deps.action)),
      queryClient.ensureQueryData(apiKeysQuery),
    ]),
  component: Activity,
});

const actionItems: { label: string; value: AuditAction | "ALL" }[] = [
  { label: "Todas", value: "ALL" },
  ...accountAuditActions.map((value) => ({ label: actionLabel[value], value })),
];

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function Activity() {
  const { action } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  // Each filter is its own query, so the pages appended with "Ver más" never mix across filters.
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    auditLogQuery(action),
  );
  const { data: keys } = useSuspenseQuery(apiKeysQuery);
  const keyNames = new Map(keys.map((key) => [key.id, key.name]));
  const entries = data.pages.flatMap((page) => page.items);

  function actor(entry: ActivityEntry): string {
    switch (entry.actorType) {
      case "USER":
        return entry.actorEmail ?? "Usuario eliminado";
      case "API_KEY":
        return (entry.actorId && keyNames.get(entry.actorId)) ?? "Llave eliminada";
      case "PLATFORM":
        return "Soporte de Cetus";
      case "SYSTEM":
        if (entry.actorId?.startsWith("certificate-upload-link:")) {
          return "Enlace de carga";
        }
        return entry.actorId?.startsWith("contact-verification-link:")
          ? "Enlace de verificación"
          : "Cetus";
    }
  }

  return (
    <>
      <PageHeader
        title="Registro de actividad"
        lead="Consulta qué cambió, cuándo ocurrió y quién lo hizo en tu cuenta."
      />

      <section className="flex flex-col gap-4" aria-label="Historial de eventos">
        <div className="flex items-center justify-between gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="group" />}>
              <ListFilterIcon data-icon="inline-start" />
              Tipo de acción: {action ? actionLabel[action] : "Todas"}
              <ChevronDownIcon
                data-icon="inline-end"
                className="transition-transform group-data-popup-open:rotate-180"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Tipo de acción</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={action ?? "ALL"}
                  onValueChange={(value: AuditAction | "ALL") =>
                    navigate({ search: { action: value === "ALL" ? undefined : value } })
                  }
                >
                  {actionItems.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="text-2xs text-muted-foreground">Más recientes primero</p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50 [&_th]:h-11">
              <TableRow>
                <TableHead className="px-5">Acción</TableHead>
                <TableHead aria-sort="descending">Fecha y hora ↓</TableHead>
                <TableHead>Quién</TableHead>
                <TableHead className="pr-5">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {action
                      ? "No hay actividad de este tipo."
                      : "Todavía no hay actividad registrada."}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const createdAt = new Date(entry.createdAt);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="px-5 py-5">
                        <div className="flex flex-col gap-0.75">
                          <Link
                            to="/activity/$eventId"
                            params={{ eventId: String(entry.id) }}
                            className="w-fit font-medium hover:underline hover:underline-offset-4"
                          >
                            {actionLabel[entry.action]}
                          </Link>
                          <span className="text-2xs text-muted-foreground">Evento #{entry.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 tabular-nums">
                          <span className="text-xs">{dayFormat.format(createdAt)}</span>
                          <span className="text-2xs text-muted-foreground">
                            {timeFormat.format(createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{actor(entry)}</span>
                          <span className="text-2xs text-muted-foreground">
                            {actorTypeLabel[entry.actorType]}
                            {entry.impersonatedBy && " · vía Soporte de Cetus"}
                          </span>
                          <span className="text-[10px] leading-normal text-muted-foreground">
                            {entry.ipAddress ? `IP ${entry.ipAddress}` : "IP no registrada"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-5 whitespace-normal">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{describeEntry(entry)}</span>
                          <span className="text-2xs text-muted-foreground">
                            {entry.resourceId ?? "Sin recurso asociado"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {hasNextPage && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage && <Spinner data-icon="inline-start" />}
              {isFetchingNextPage ? "Cargando…" : "Ver más"}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-2 text-2xs text-muted-foreground">
          <p>
            {plural(entries.length, "evento", "eventos")} ·{" "}
            {action ? actionLabel[action] : "Todas las acciones"}
          </p>
          <p>Horarios de Colombia (UTC−5)</p>
        </div>
      </section>

      <AuditRecordNotice />
    </>
  );
}
