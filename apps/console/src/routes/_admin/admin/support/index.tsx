import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { PageHeader } from "~/components/PageHeader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
import { adminFeedbackQuery, adminSupportTicketsQuery } from "~/features/admin/queries";
import { dayFormat, timeFormat } from "~/features/audit-log/labels";
import { priorityLabel, statusLabel } from "~/features/support/labels";
import { ticketStatuses } from "~/features/support/schema";
import type { SupportTicketPriority, SupportTicketStatus } from "~/lib/api/types";

type SupportView = SupportTicketStatus | "ALL" | "FEEDBACK";

const views = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "ALL",
  "FEEDBACK",
] as const satisfies readonly SupportView[];

export const Route = createFileRoute("/_admin/admin/support/")({
  validateSearch: (search: Record<string, unknown>): { view?: SupportView } => ({
    view: views.find((view) => view === search.view),
  }),
  loaderDeps: ({ search }) => ({ view: search.view ?? "OPEN" }),
  loader: async ({ context: { queryClient }, deps }) => {
    if (deps.view === "FEEDBACK") {
      await queryClient.infiniteQuery({ ...adminFeedbackQuery, staleTime: "static" });
    } else {
      await queryClient.infiniteQuery({
        ...adminSupportTicketsQuery(statusOf(deps.view)),
        staleTime: "static",
      });
    }
  },
  component: Support,
});

function statusOf(view: SupportView): SupportTicketStatus | undefined {
  return ticketStatuses.find((status) => status === view);
}

const attachmentPlurals = new Intl.PluralRules("es-CO");

function attachmentCountLabel(count: number) {
  return attachmentPlurals.select(count) === "one" ? "1 adjunto" : `${count} adjuntos`;
}

function dateTime(value: string) {
  const date = new Date(value);
  return `${dayFormat.format(date)}, ${timeFormat.format(date)}`;
}

const priorityVariant: Record<SupportTicketPriority, "destructive" | "secondary" | "muted"> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "muted",
};

function Support() {
  const { view = "OPEN" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <>
      <PageHeader
        title="Soporte"
        lead="Los casos y opiniones que llegan desde la consola. Se responden por correo; aquí se sigue su estado."
      />
      <section className="flex flex-col gap-4" aria-label="Casos y opiniones">
        <Tabs
          value={view}
          onValueChange={(value) =>
            navigate({ search: { view: views.find((each) => each === value) } })
          }
        >
          <TabsList>
            {ticketStatuses.map((status) => (
              <TabsTrigger key={status} value={status}>
                {statusLabel[status]}
              </TabsTrigger>
            ))}
            <TabsTrigger value="ALL">Todos</TabsTrigger>
            <TabsTrigger value="FEEDBACK">Opiniones</TabsTrigger>
          </TabsList>
        </Tabs>
        {view === "FEEDBACK" ? <Feedback /> : <Tickets status={statusOf(view)} />}
      </section>
    </>
  );
}

function Tickets({ status }: { status: SupportTicketStatus | undefined }) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    adminSupportTicketsQuery(status),
  );
  const tickets = data.pages.flatMap((page) => page.items);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50 [&_th]:h-11">
            <TableRow>
              <TableHead className="px-5">Caso</TableHead>
              <TableHead>Organización</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="pr-5 text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hay casos en este estado.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="max-w-md px-5 py-4 whitespace-normal">
                    <div className="flex flex-col gap-0.75">
                      <Link
                        to="/admin/support/$ticketId"
                        params={{ ticketId: ticket.id }}
                        className="w-fit font-medium hover:underline hover:underline-offset-4"
                      >
                        #{ticket.number}
                      </Link>
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {ticket.message}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/admin/organizations/$accountId"
                      params={{ accountId: ticket.accountId }}
                      className="hover:underline hover:underline-offset-4"
                    >
                      {ticket.accountName}
                    </Link>
                    <span className="block text-2xs text-muted-foreground">{ticket.userEmail}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[ticket.priority]}>
                      {priorityLabel[ticket.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>{statusLabel[ticket.status]}</TableCell>
                  <TableCell className="pr-5 text-right text-xs">
                    {dateTime(ticket.createdAt)}
                    {ticket.attachmentCount > 0 && (
                      <span className="block text-2xs text-muted-foreground">
                        {attachmentCountLabel(ticket.attachmentCount)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <LoadMore
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}

function Feedback() {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(adminFeedbackQuery);
  const items = data.pages.flatMap((page) => page.items);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50 [&_th]:h-11">
            <TableRow>
              <TableHead className="px-5">Opinión</TableHead>
              <TableHead>Organización</TableHead>
              <TableHead className="pr-5 text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Todavía no hay opiniones.
                </TableCell>
              </TableRow>
            ) : (
              items.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell className="max-w-xl px-5 py-4 whitespace-pre-wrap">
                    {feedback.message}
                    {feedback.page && (
                      <span className="block text-2xs text-muted-foreground">
                        Desde {feedback.page}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/admin/organizations/$accountId"
                      params={{ accountId: feedback.accountId }}
                      className="hover:underline hover:underline-offset-4"
                    >
                      {feedback.accountName}
                    </Link>
                    <span className="block text-2xs text-muted-foreground">
                      {feedback.userEmail}
                    </span>
                  </TableCell>
                  <TableCell className="pr-5 text-right text-xs">
                    {dateTime(feedback.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <LoadMore
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}

function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}) {
  if (!hasNextPage) {
    return null;
  }
  return (
    <div className="flex justify-center">
      <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
        {isFetchingNextPage && <Spinner data-icon="inline-start" />}
        {isFetchingNextPage ? "Cargando…" : "Ver más"}
      </Button>
    </div>
  );
}
