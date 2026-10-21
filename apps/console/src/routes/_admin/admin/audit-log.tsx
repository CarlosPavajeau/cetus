import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDownIcon, ListFilterIcon, XIcon } from "lucide-react";

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
import { adminAuditLogQuery } from "~/features/admin/queries";
import type { AdminActivityEntry } from "~/features/admin/server";
import { describeEntry } from "~/features/audit-log/describe";
import { actionLabel, actorTypeLabel, dayFormat, timeFormat } from "~/features/audit-log/labels";
import { type AuditAction, auditActions } from "~/lib/api/types";

type AuditSearch = { accountId?: string; action?: AuditAction };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_admin/admin/audit-log")({
  validateSearch: (search: Record<string, unknown>): AuditSearch => ({
    accountId:
      typeof search.accountId === "string" && uuidPattern.test(search.accountId)
        ? search.accountId
        : undefined,
    action: auditActions.find((action) => action === search.action),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureInfiniteQueryData(adminAuditLogQuery(deps)),
  component: AdminAuditLog,
});

const actionItems: { label: string; value: AuditAction | "ALL" }[] = [
  { label: "Todas", value: "ALL" },
  ...auditActions.map((value) => ({ label: actionLabel[value], value })),
];

function actor(entry: AdminActivityEntry): string {
  switch (entry.actorType) {
    case "USER":
    case "PLATFORM":
      return entry.actorEmail ?? entry.actorId ?? "Usuario eliminado";
    case "API_KEY":
      return `Llave ${entry.actorId ?? ""}`;
    case "SYSTEM":
      return "Cetus";
  }
}

function AdminAuditLog() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    adminAuditLogQuery(search),
  );
  const entries = data.pages.flatMap((page) => page.items);
  const accountName = search.accountId
    ? entries.find((entry) => entry.accountId === search.accountId)?.accountName
    : undefined;

  return (
    <>
      <PageHeader
        title="Auditoría"
        lead="Todo lo que cambió en cada cuenta, y las acciones del equipo de Cetus."
      />

      <section className="flex flex-col gap-4" aria-label="Eventos">
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="group" />}>
              <ListFilterIcon data-icon="inline-start" />
              Tipo de acción: {search.action ? actionLabel[search.action] : "Todas"}
              <ChevronDownIcon
                data-icon="inline-end"
                className="transition-transform group-data-popup-open:rotate-180"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Tipo de acción</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={search.action ?? "ALL"}
                  onValueChange={(value: AuditAction | "ALL") =>
                    navigate({
                      search: (prev) => ({ ...prev, action: value === "ALL" ? undefined : value }),
                    })
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
          {search.accountId && (
            <Button
              variant="secondary"
              onClick={() => navigate({ search: (prev) => ({ ...prev, accountId: undefined }) })}
            >
              Cuenta: {accountName ?? search.accountId}
              <XIcon data-icon="inline-end" />
              <span className="sr-only">Quitar el filtro de cuenta</span>
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50 [&_th]:h-11">
              <TableRow>
                <TableHead className="px-5">Acción</TableHead>
                <TableHead aria-sort="descending">Fecha y hora ↓</TableHead>
                <TableHead>Quién</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="pr-5">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No hay eventos con este filtro.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const createdAt = new Date(entry.createdAt);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="px-5 py-4">
                        <div className="flex flex-col gap-0.75">
                          <span className="font-medium">{actionLabel[entry.action]}</span>
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
                            {entry.impersonatorEmail && ` · vía ${entry.impersonatorEmail}`}
                            {entry.ipAddress ? ` · IP ${entry.ipAddress}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.accountId ? (
                          <Link
                            to="/admin/organizations/$accountId"
                            params={{ accountId: entry.accountId }}
                            className="hover:underline hover:underline-offset-4"
                          >
                            {entry.accountName ?? entry.accountId}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Sin cuenta</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-5 text-xs whitespace-normal">
                        {describeEntry(entry)}
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
        <p className="text-2xs text-muted-foreground">Horarios de Colombia (UTC−5)</p>
      </section>
    </>
  );
}
