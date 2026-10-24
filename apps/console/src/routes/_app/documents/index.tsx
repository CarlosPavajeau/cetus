import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type } from "arktype";
import { FileTextIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
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
import { DocumentStatusBadge } from "~/features/documents/DocumentStatusBadge";
import { IssueDateFilter } from "~/features/documents/IssueDateFilter";
import {
  documentStatusLabel,
  documentTypeLabel,
  formatDay,
  formatMoney,
} from "~/features/documents/labels";
import { documentsQuery } from "~/features/documents/queries";
import { type DocumentFilters, documentFilters } from "~/features/documents/server";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import {
  type DocumentSummary,
  documentStatuses,
  documentTypes,
  type Environment,
} from "~/lib/api/types";

/** The environment comes from the console's selector, not the URL. */
type SearchFilters = Omit<DocumentFilters, "environment">;

export const Route = createFileRoute("/_app/documents/")({
  // Unknown or malformed params are dropped instead of failing the page.
  validateSearch: (search: Record<string, unknown>): SearchFilters => {
    const filters: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(search)) {
      // The router parses "?q=123" as a number.
      const raw = typeof value === "number" ? String(value) : value;
      if (
        key !== "environment" &&
        raw !== "" &&
        !(documentFilters({ [key]: raw }) instanceof type.errors)
      ) {
        filters[key] = raw;
      }
    }
    return filters as SearchFilters;
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const environment = await queryClient.ensureQueryData(activeEnvironmentQuery);
    await queryClient.ensureInfiniteQueryData(documentsQuery(withEnvironment(deps, environment)));
  },
  component: Documents,
});

/** An issuer has a single environment, so its documents are listed whatever the selector says. */
function withEnvironment(filters: SearchFilters, environment: Environment): DocumentFilters {
  return filters.issuerId ? filters : { ...filters, environment };
}

type Option = { label: string; value: string };

const typeItems: Option[] = [
  { label: "Todos los tipos", value: "ALL" },
  ...documentTypes.map((value) => ({ label: documentTypeLabel[value], value })),
];

const statusItems: Option[] = [
  { label: "Todos los estados", value: "ALL" },
  ...documentStatuses.map((value) => ({ label: documentStatusLabel[value], value })),
];

function FilterSelect({
  items,
  value,
  label,
  onChange,
}: {
  items: Option[];
  value: string | undefined;
  label: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select
      items={items}
      value={value ?? "ALL"}
      onValueChange={(next) => onChange(next === "ALL" || next === null ? undefined : String(next))}
    >
      <SelectTrigger aria-label={label} className="min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Applies the text on Enter, and clears the filter as soon as the box is emptied. */
function SearchBox({
  applied,
  onSearch,
}: {
  applied: string | undefined;
  onSearch: (q: string | undefined) => void;
}) {
  const [text, setText] = useState(applied ?? "");
  return (
    <search>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(text.trim() || undefined);
        }}
      >
        <InputGroup className="md:w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (!event.target.value && applied) {
                onSearch(undefined);
              }
            }}
            maxLength={100}
            placeholder="Número, cliente o referencia…"
            aria-label="Buscar documentos"
          />
        </InputGroup>
      </form>
    </search>
  );
}

function Documents() {
  const filters = Route.useSearch();
  const environment = useActiveEnvironment();
  const navigate = useNavigate({ from: Route.fullPath });
  // Each filter set is its own query, so the pages appended with "Ver más" never mix across filters.
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    documentsQuery(withEnvironment(filters, environment)),
  );
  const documents = data.pages.flatMap((page) => page.items);
  const filtered = Object.values(filters).some((value) => value !== undefined);

  function update(changes: Partial<SearchFilters>) {
    void navigate({ search: (previous) => ({ ...previous, ...changes }), replace: true });
  }

  return (
    <>
      <PageHeader
        title="Documentos"
        lead="Facturas y notas de la cuenta, con su estado ante la DIAN y su entrega al cliente."
      />

      <section className="flex flex-col gap-4" aria-label="Tus documentos">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-xs text-muted-foreground">
            {filters.issuerId
              ? "Documentos de un emisor"
              : `Documentos en ${environmentLabel[environment].toLowerCase()}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              items={typeItems}
              value={filters.type}
              label="Tipo de documento"
              onChange={(value) => update({ type: value as DocumentFilters["type"] })}
            />
            <FilterSelect
              items={statusItems}
              value={filters.status}
              label="Estado"
              onChange={(value) => update({ status: value as DocumentFilters["status"] })}
            />
            <IssueDateFilter from={filters.from} to={filters.to} onChange={update} />
            {/* Keyed by the applied text, so going back in history resets the box. */}
            <SearchBox key={filters.q ?? ""} applied={filters.q} onSearch={(q) => update({ q })} />
          </div>
        </div>

        {filters.issuerId && (
          <p className="text-2xs text-muted-foreground">
            Solo los documentos de un emisor.{" "}
            <button
              type="button"
              className="underline underline-offset-4 hover:text-foreground"
              onClick={() => update({ issuerId: undefined })}
            >
              Ver los de todos
            </button>
          </p>
        )}

        {documents.length === 0 && !filtered ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon />
              </EmptyMedia>
              <EmptyTitle>Aún no hay documentos</EmptyTitle>
              <EmptyDescription>
                Las facturas y notas que emitas con la API aparecerán aquí con su estado ante la
                DIAN.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-11">
                <TableRow>
                  <TableHead className="px-5">Documento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emisión</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="pr-5">Ambiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Ningún documento coincide con los filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((document) => <DocumentRow key={document.id} document={document} />)
                )}
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

        <p className="text-2xs text-muted-foreground">Más recientes primero</p>
      </section>
    </>
  );
}

function DocumentRow({ document }: { document: DocumentSummary }) {
  return (
    <TableRow>
      <TableCell className="px-5 py-4">
        <div className="flex flex-col gap-0.75">
          <Link
            to="/documents/$documentId"
            params={{ documentId: document.id }}
            className="w-fit font-medium tabular-nums hover:underline hover:underline-offset-4"
          >
            {document.number}
          </Link>
          <span className="text-2xs text-muted-foreground">
            {documentTypeLabel[document.documentType]} · {document.issuerName}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs">{document.customerName}</span>
          <span className="text-2xs text-muted-foreground tabular-nums">
            {document.customerIdentification}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-xs">{formatDay(document.issueDate)}</TableCell>
      <TableCell className="text-right text-xs tabular-nums">
        {formatMoney(document.payable, document.currency)}
      </TableCell>
      <TableCell>
        <DocumentStatusBadge status={document.status} />
      </TableCell>
      <TableCell className="pr-5">
        <EnvironmentBadge environment={document.environment} />
      </TableCell>
    </TableRow>
  );
}
