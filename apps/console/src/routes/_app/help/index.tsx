import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRightIcon, LifeBuoyIcon, PlusIcon } from "lucide-react";

import { PageHeader } from "~/components/PageHeader";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
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
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { dayFormat } from "~/features/audit-log/labels";
import { FeedbackDialog } from "~/features/support/FeedbackDialog";
import { priorityLabel, statusLabel } from "~/features/support/labels";
import { NewTicketDialog } from "~/features/support/NewTicketDialog";
import { supportTicketsQuery } from "~/features/support/queries";
import type { SupportTicketStatus } from "~/lib/api/types";
import { docsUrl } from "~/lib/docs";
import { cn, uuidPattern } from "~/lib/utils";

type HelpSearch = { new?: true; issuerId?: string };

/**
 * Where to ask the Cetus team for help: a ticket answered by email, the documentation and a box for
 * opinions. `?new` opens the ticket form, about `?issuerId=` when given.
 */
export const Route = createFileRoute("/_app/help/")({
  validateSearch: (search): HelpSearch => {
    const issuerId = typeof search.issuerId === "string" ? search.issuerId : "";
    return {
      ...((search.new === true || search.new === "true") && { new: true as const }),
      ...(uuidPattern.test(issuerId) && { issuerId }),
    };
  },
  loader: ({ context: { queryClient } }) =>
    queryClient.infiniteQuery({ ...supportTicketsQuery, staleTime: "static" }),
  component: Help,
});

const statusVariant: Record<SupportTicketStatus, "default" | "secondary" | "muted"> = {
  OPEN: "default",
  IN_PROGRESS: "secondary",
  RESOLVED: "muted",
};

function Help() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <>
      <PageHeader
        title="Ayuda"
        lead="Escríbele al equipo de Cetus, consulta la documentación o cuéntanos qué mejorar."
      />

      <Card>
        <CardHeader>
          <CardTitle>¿Necesitas ayuda con algo?</CardTitle>
          <CardDescription>
            Te atiende una persona del equipo de Cetus y te responde por correo.
          </CardDescription>
          <CardAction>
            <NewTicketDialog
              issuerId={search.issuerId}
              open={search.new}
              onOpenChange={(open) => {
                if (!open && search.new) {
                  void navigate({ search: {}, replace: true });
                }
              }}
              trigger={
                <Button>
                  <PlusIcon data-icon="inline-start" />
                  Nuevo caso
                </Button>
              }
            />
          </CardAction>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentación</CardTitle>
            <CardDescription>
              Guías de inicio rápido, ambientes, ciclo de vida de los documentos y la referencia de
              la API.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Leer las guías
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comparte tu opinión</CardTitle>
            <CardDescription>
              Ideas, cosas que te confunden o lo que te gustaría que Cetus hiciera.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <FeedbackDialog trigger={<Button variant="outline">Escribir opinión</Button>} />
          </CardFooter>
        </Card>
      </div>

      <Tickets />
    </>
  );
}

function Tickets() {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(supportTicketsQuery);
  const tickets = data.pages.flatMap((page) => page.items);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="help-tickets">
      <h2 id="help-tickets" className="font-heading text-xl tracking-tight">
        Casos de la organización
      </h2>
      {tickets.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LifeBuoyIcon />
            </EmptyMedia>
            <EmptyTitle>Sin casos de soporte</EmptyTitle>
            <EmptyDescription>
              Los casos que abra cualquier miembro de la organización aparecen aquí con su estado.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50 [&_th]:h-11">
              <TableRow>
                <TableHead className="px-5">Caso</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-5 text-right">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="max-w-md px-5 py-4 whitespace-normal">
                    <div className="flex flex-col gap-0.75">
                      <span className="font-medium">#{ticket.number}</span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {ticket.message}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{priorityLabel[ticket.priority]}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[ticket.status]}>
                      {statusLabel[ticket.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {dayFormat.format(new Date(ticket.createdAt))}
                    <span className="block text-2xs text-muted-foreground">{ticket.userEmail}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Spinner data-icon="inline-start" />}
            {isFetchingNextPage ? "Cargando…" : "Ver más"}
          </Button>
        </div>
      )}
    </section>
  );
}
