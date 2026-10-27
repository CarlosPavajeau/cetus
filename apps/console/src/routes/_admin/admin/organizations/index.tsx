import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "~/components/PageHeader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { accountStatusLabel } from "~/features/admin/labels";
import { adminAccountsQuery } from "~/features/admin/queries";
import { type AccountStatus, accountStatuses } from "~/features/admin/schema";
import { dayFormat } from "~/features/audit-log/labels";
import { entryOf } from "~/lib/utils";

type OrganizationsSearch = { status?: AccountStatus; q?: string };

export const Route = createFileRoute("/_admin/admin/organizations/")({
  validateSearch: (search: Record<string, unknown>): OrganizationsSearch => ({
    status: accountStatuses.find((status) => status === search.status),
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim().slice(0, 100) : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureInfiniteQueryData(
      adminAccountsQuery({ status: deps.status, search: deps.q }),
    ),
  component: Organizations,
});

const statusVariant: Record<AccountStatus, "secondary" | "destructive" | "outline"> = {
  ACTIVE: "secondary",
  SUSPENDED: "destructive",
  CLOSED: "outline",
};

function Organizations() {
  const { status, q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [search, setSearch] = useState(q ?? "");
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    adminAccountsQuery({ status, search: q }),
  );
  const accounts = data.pages.flatMap((page) => page.items);

  return (
    <>
      <PageHeader
        title="Organizaciones"
        lead="Todas las cuentas de Cetus, con sus emisores, su uso del mes y los rechazos recientes de la DIAN."
      />

      <section className="flex flex-col gap-4" aria-label="Cuentas">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={status ?? "ALL"}
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  status: accountStatuses.find((each) => each === value),
                }),
              })
            }
          >
            <TabsList className="gap-0.75">
              <TabsTrigger value="ALL">Todas</TabsTrigger>
              {accountStatuses.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {accountStatusLabel[value]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <search className="sm:w-80">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void navigate({ search: (prev) => ({ ...prev, q: search.trim() || undefined }) });
              }}
            >
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre y Enter…"
                  aria-label="Buscar organizaciones"
                />
              </InputGroup>
            </form>
          </search>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50 [&_th]:h-11">
              <TableRow>
                <TableHead className="px-5">Organización</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Emisores</TableHead>
                <TableHead className="text-right">Documentos del mes</TableHead>
                <TableHead className="pr-5 text-right">Fallas (7 días)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {q || status
                      ? "Ninguna organización coincide con el filtro."
                      : "Todavía no hay organizaciones."}
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-0.75">
                        <Link
                          to="/admin/organizations/$accountId"
                          params={{ accountId: account.id }}
                          className="w-fit font-medium hover:underline hover:underline-offset-4"
                        >
                          {account.name}
                        </Link>
                        <span className="text-2xs text-muted-foreground">
                          Plan {account.plan.toLowerCase()} · desde{" "}
                          {dayFormat.format(new Date(account.createdAt))}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entryOf(statusVariant, account.status) ?? "outline"}>
                        {entryOf(accountStatusLabel, account.status) ?? account.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {account.issuers}
                      {account.liveIssuersEnabled > 0 && (
                        <span className="block text-2xs text-muted-foreground">
                          {account.liveIssuersEnabled} en producción
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {account.liveDocumentsThisMonth}
                      <span className="block text-2xs text-muted-foreground">producción</span>
                    </TableCell>
                    <TableCell className="pr-5 text-right tabular-nums">
                      <span className={account.recentFailures > 0 ? "text-destructive" : undefined}>
                        {account.recentFailures}
                      </span>
                      {account.lastFailureAt && (
                        <span className="block text-2xs text-muted-foreground">
                          última {dayFormat.format(new Date(account.lastFailureAt))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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
      </section>
    </>
  );
}
