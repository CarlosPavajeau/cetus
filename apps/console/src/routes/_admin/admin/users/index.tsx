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
import { adminUsersQuery } from "~/features/admin/queries";
import { BanBadge, PlatformRoleBadge } from "~/features/admin/UserBadges";
import { dayFormat } from "~/features/audit-log/labels";

type UsersSearch = { q?: string };

export const Route = createFileRoute("/_admin/admin/users/")({
  validateSearch: (search: Record<string, unknown>): UsersSearch => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim().slice(0, 100) : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.infiniteQuery({ ...adminUsersQuery(deps.q), staleTime: "static" }),
  component: Users,
});

function Users() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [search, setSearch] = useState(q ?? "");
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    adminUsersQuery(q),
  );
  const users = data.pages.flatMap((page) => page.users);
  const total = data.pages[0]?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Usuarios"
        count={total}
        lead="Las personas que entran a la consola, de todas las organizaciones."
      />

      <section className="flex flex-col gap-4" aria-label="Usuarios">
        <search className="sm:w-80">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void navigate({ search: { q: search.trim() || undefined } });
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
                placeholder="Buscar por correo y Enter…"
                aria-label="Buscar usuarios"
              />
            </InputGroup>
          </form>
        </search>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50 [&_th]:h-11">
              <TableRow>
                <TableHead className="px-5">Persona</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead className="pr-5">Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {q ? "Ningún correo coincide con la búsqueda." : "Todavía no hay usuarios."}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-0.75">
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: person.id }}
                          className="flex w-fit items-center gap-2 font-medium hover:underline hover:underline-offset-4"
                        >
                          {person.name || person.email}
                          <PlatformRoleBadge role={person.platformRole} />
                        </Link>
                        <span className="text-2xs text-muted-foreground">{person.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <BanBadge user={person} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {person.twoFactorEnabled ? (
                        <Badge variant="secondary">Activa</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-xs tabular-nums">
                      {dayFormat.format(new Date(person.createdAt))}
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
