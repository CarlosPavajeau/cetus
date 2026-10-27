import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BuildingIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { CopyButton } from "~/components/CopyButton";
import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { IssuerStatusBadge } from "~/features/issuers/IssuerStatusBadge";
import { issuerName } from "~/features/issuers/labels";
import { issuersQuery } from "~/features/issuers/queries";
import { ReadOnlyNotice } from "~/features/session/ReadOnlyNotice";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import { type Environment, type Issuer, environments } from "~/lib/api/types";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/issuers/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.query({ ...issuersQuery, staleTime: "static" }),
  component: Issuers,
});

const environmentFilters = ["ALL", ...environments] as const;

type EnvironmentFilter = (typeof environmentFilters)[number];

function NewIssuer() {
  return (
    <Link to="/setup" search={{ new: true }} className={cn(buttonVariants())}>
      <PlusIcon data-icon="inline-start" />
      Nuevo emisor
    </Link>
  );
}

function Issuers() {
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  const { manage } = useMemberPermissions();
  const [environment, setEnvironment] = useState<EnvironmentFilter>("ALL");
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const visibleIssuers = issuers.filter(
    (issuer) =>
      (environment === "ALL" || issuer.environment === environment) &&
      (!term ||
        issuer.legalName.toLowerCase().includes(term) ||
        issuer.tradeName?.toLowerCase().includes(term) ||
        issuer.nit.includes(term) ||
        issuer.id.includes(term)),
  );
  const count = (value: Environment) =>
    issuers.filter((issuer) => issuer.environment === value).length;

  return (
    <>
      <PageHeader
        title="Emisores"
        count={issuers.length}
        lead="Las empresas que facturan desde esta cuenta. Cada una tiene su ID para la API."
        action={manage ? <NewIssuer /> : undefined}
      />
      <ReadOnlyNotice>
        Los emisores los crean y configuran los dueños y administradores de la organización.
      </ReadOnlyNotice>

      {issuers.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BuildingIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes emisores</EmptyTitle>
            <EmptyDescription>
              Un emisor es la empresa que factura: su NIT, su certificado de firma y su resolución
              de numeración. El asistente te guía para configurarlo.
            </EmptyDescription>
          </EmptyHeader>
          {manage && (
            <EmptyContent>
              <NewIssuer />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <section className="flex flex-col gap-4" aria-label="Tus emisores">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={environment}
              onValueChange={(value) => {
                const next = environmentFilters.find((each) => each === value);
                if (next) {
                  setEnvironment(next);
                }
              }}
            >
              <TabsList className="gap-0.75">
                <TabsTrigger value="ALL">
                  Todos <span className="text-muted-foreground">{issuers.length}</span>
                </TabsTrigger>
                <TabsTrigger value="LIVE">
                  Producción <span className="text-muted-foreground">{count("LIVE")}</span>
                </TabsTrigger>
                <TabsTrigger value="TEST">
                  Pruebas <span className="text-muted-foreground">{count("TEST")}</span>
                </TabsTrigger>
                <TabsTrigger value="SANDBOX">
                  Simulación <span className="text-muted-foreground">{count("SANDBOX")}</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <InputGroup className="md:w-64">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, NIT o ID…"
                aria-label="Buscar emisores"
              />
            </InputGroup>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-11">
                <TableRow>
                  <TableHead className="px-5">Emisor</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="pr-5">ID para la API</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleIssuers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Ningún emisor coincide con los filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleIssuers.map((issuer) => <IssuerRow key={issuer.id} issuer={issuer} />)
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <p className="mt-auto text-2xs text-muted-foreground">
        Envía el ID del emisor como <code>issuerId</code> en <code>POST /v1/invoices</code>. Una
        llave de API puede facturar por cualquier emisor de su mismo ambiente.
      </p>
    </>
  );
}

function IssuerRow({ issuer }: { issuer: Issuer }) {
  const { manage } = useMemberPermissions();
  return (
    <TableRow>
      <TableCell className="px-5 py-5">
        <div className="flex flex-col gap-0.75">
          <Link
            to="/issuers/$issuerId"
            params={{ issuerId: issuer.id }}
            className="w-fit font-medium hover:underline hover:underline-offset-4"
          >
            {issuerName(issuer)}
          </Link>
          {issuer.tradeName && (
            <span className="text-2xs text-muted-foreground">{issuer.legalName}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="tabular-nums">
        {issuer.nit}-{issuer.checkDigit}
      </TableCell>
      <TableCell>
        <EnvironmentBadge environment={issuer.environment} />
      </TableCell>
      <TableCell>
        {manage && issuer.status === "ONBOARDING" ? (
          <Link
            to="/setup"
            search={{ issuerId: issuer.id }}
            className={cn(
              buttonVariants({ variant: "link", size: "sm", className: "h-auto px-0" }),
            )}
          >
            Continuar configuración
          </Link>
        ) : (
          <IssuerStatusBadge status={issuer.status} />
        )}
      </TableCell>
      <TableCell className="pr-5">
        <div className="flex items-center gap-1">
          {/* The tail tells issuers apart: the head of a UUID v7 is its timestamp. */}
          <code className="text-xs text-muted-foreground" title={issuer.id}>
            …{issuer.id.slice(-8)}
          </code>
          <CopyButton value={issuer.id} label={`Copiar ID de ${issuerName(issuer)}`} iconOnly />
        </div>
      </TableCell>
    </TableRow>
  );
}
