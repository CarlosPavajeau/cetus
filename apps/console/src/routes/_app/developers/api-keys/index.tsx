import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  ListFilterIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
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
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ApiKeyStatusBadge } from "~/features/api-keys/ApiKeyStatusBadge";
import { dateFormat, dateTimeFormat } from "~/features/api-keys/formats";
import { apiKeysQuery } from "~/features/api-keys/queries";
import { RevokeApiKey, useInvalidateApiKeys } from "~/features/api-keys/RevokeApiKey";
import { createApiKeySchema } from "~/features/api-keys/schema";
import { createApiKey } from "~/features/api-keys/server";
import { ReadOnlyNotice } from "~/features/session/ReadOnlyNotice";
import { useImpersonation } from "~/features/session/useImpersonation";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import { type ApiKey, type Environment, environments } from "~/lib/api/types";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/developers/api-keys/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.query({ ...apiKeysQuery, staleTime: "static" }),
  component: ApiKeys,
});

const relativeFormat = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });

const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "hace 2 minutos", "ayer"… Anything under a minute reads as "ahora". */
function formatRelative(date: Date) {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  for (const [unit, size] of relativeUnits) {
    if (Math.abs(seconds) >= size) {
      return relativeFormat.format(Math.round(seconds / size), unit);
    }
  }
  return "ahora";
}

const environmentItems: { label: string; value: Environment }[] = [
  { label: "Simulación (sin la DIAN)", value: "SANDBOX" },
  { label: "Pruebas (habilitación DIAN)", value: "TEST" },
  { label: "Producción", value: "LIVE" },
];

const environmentFilters = ["ALL", ...environments] as const;

type EnvironmentFilter = (typeof environmentFilters)[number];
type StatusFilter = "ALL" | "ACTIVE" | "REVOKED";

const statusFilterItems: { label: string; value: StatusFilter }[] = [
  { label: "Todas", value: "ALL" },
  { label: "Activas", value: "ACTIVE" },
  { label: "Revocadas", value: "REVOKED" },
];

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function ApiKeys() {
  const { data: keys } = useSuspenseQuery(apiKeysQuery);
  const [environment, setEnvironment] = useState<EnvironmentFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const visibleKeys = keys.filter(
    (key) =>
      (environment === "ALL" || key.environment === environment) &&
      (status === "ALL" || (status === "REVOKED") === Boolean(key.revokedAt)) &&
      (!term || key.name.toLowerCase().includes(term) || key.prefix.toLowerCase().includes(term)),
  );
  const count = (value: Environment) => keys.filter((key) => key.environment === value).length;
  const revokedCount = keys.filter((key) => key.revokedAt).length;

  return (
    <>
      <PageHeader
        title="Llaves de API"
        count={keys.length}
        lead="Administra el acceso a la API de facturación electrónica de tu empresa."
        action={<CreateApiKey />}
      />
      <ReadOnlyNotice>
        Las llaves las crean y revocan los dueños y administradores de la organización.
      </ReadOnlyNotice>

      {keys.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyRoundIcon />
            </EmptyMedia>
            <EmptyTitle>Todavía no hay llaves</EmptyTitle>
            <EmptyDescription>Crea una de pruebas para empezar a integrar.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateApiKey />
          </EmptyContent>
        </Empty>
      ) : (
        <section className="flex flex-col gap-4" aria-label="Tus llaves">
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
                  Todas <span className="text-muted-foreground">{keys.length}</span>
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
            <div className="flex items-center gap-2.5">
              <InputGroup className="md:w-64">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre o prefijo…"
                  aria-label="Buscar llaves"
                />
              </InputGroup>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  <ListFilterIcon data-icon="inline-start" />
                  Estado
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Estado</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={status}
                      onValueChange={(value) => {
                        const next = statusFilterItems.find((item) => item.value === value);
                        if (next) {
                          setStatus(next.value);
                        }
                      }}
                    >
                      {statusFilterItems.map((item) => (
                        <DropdownMenuRadioItem key={item.value} value={item.value}>
                          {item.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-11">
                <TableRow>
                  <TableHead className="px-5">Nombre</TableHead>
                  <TableHead>Llave</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead className="pr-5">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Ninguna llave coincide con los filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleKeys.map((key) => <ApiKeyRow key={key.id} apiKey={key} />)
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap justify-between gap-2 text-2xs text-muted-foreground">
            <p>
              {plural(keys.length, "llave", "llaves")} ·{" "}
              {plural(keys.length - revokedCount, "activa", "activas")} ·{" "}
              {plural(revokedCount, "revocada", "revocadas")}
            </p>
            <p>Horarios de Colombia (UTC−5)</p>
          </div>
        </section>
      )}

      <Alert className="gap-y-1.25 p-5 has-[>svg]:gap-x-3.5">
        <ShieldCheckIcon className="size-5" />
        <AlertTitle>Tus credenciales, bajo control</AlertTitle>
        <AlertDescription>
          <p>
            Usa una llave por integración y envíala en el encabezado{" "}
            <code>Authorization: Bearer …</code>. Las llaves de pruebas envían a la habilitación de
            la DIAN y no emiten documentos con validez fiscal.
          </p>
        </AlertDescription>
      </Alert>

      <p className="mt-auto text-2xs text-muted-foreground">
        Los cambios en tus llaves se registran en la{" "}
        <Link to="/activity" className="underline underline-offset-4 hover:text-foreground">
          actividad
        </Link>
        .
      </p>
    </>
  );
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKey }) {
  const revoked = Boolean(apiKey.revokedAt);
  const lastUsed = apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt) : null;

  return (
    <TableRow>
      <TableCell className="px-5 py-5">
        <div className="flex flex-col gap-0.75">
          <Link
            to="/developers/api-keys/$keyId"
            params={{ keyId: apiKey.id }}
            className={cn(
              "w-fit hover:underline hover:underline-offset-4",
              revoked ? "text-muted-foreground" : "font-medium",
            )}
          >
            {apiKey.name}
          </Link>
          <span className="text-2xs text-muted-foreground">
            Creada el {dateFormat.format(new Date(apiKey.createdAt))}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs text-muted-foreground">{apiKey.prefix}…</code>
      </TableCell>
      <TableCell>
        <EnvironmentBadge environment={apiKey.environment} />
      </TableCell>
      <TableCell>
        <ApiKeyStatusBadge apiKey={apiKey} />
      </TableCell>
      <TableCell>
        {lastUsed ? (
          <div className="flex flex-col gap-0.5">
            <span
              className={revoked ? "text-xs text-muted-foreground" : "text-xs"}
              suppressHydrationWarning
            >
              {formatRelative(lastUsed)}
            </span>
            <span className="text-2xs text-muted-foreground">
              {dateTimeFormat.format(lastUsed)}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Nunca</span>
        )}
      </TableCell>
      <TableCell className="pr-5">
        {!revoked && (
          <div className="flex justify-end">
            <RevokeApiKey apiKey={apiKey}>Revocar</RevokeApiKey>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

/** Creating keys stays with the customer's owners and admins, also while the Cetus team acts as them. */
function CreateApiKey() {
  const impersonation = useImpersonation();
  const { manage } = useMemberPermissions();
  if (!manage) {
    return null;
  }
  return impersonation ? (
    <Button disabled title="No disponible mientras ves la consola como otra persona">
      <PlusIcon data-icon="inline-start" />
      Crear llave
    </Button>
  ) : (
    <CreateApiKeyDialog />
  );
}

function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const invalidateApiKeys = useInvalidateApiKeys();
  const create = useMutation({
    mutationFn: createApiKey,
    onSuccess: invalidateApiKeys,
  });
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm({
    resolver: arktypeResolver(createApiKeySchema),
    defaultValues: { name: "", environment: "SANDBOX" as Environment },
  });
  const { isSubmitting } = form.formState;

  const onCreate = form.handleSubmit(async (values) => {
    const created = await create.mutateAsync({ data: values });
    setSecret(created.secret);
    setCopied(false);
    form.reset();
  });

  async function copySecret() {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Forget the secret once the dialog closes: it is shown only once.
    if (!next) {
      setSecret(null);
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Crear llave
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle>Copia tu llave ahora</DialogTitle>
              <DialogDescription>
                Por seguridad solo la mostramos una vez. Si la pierdes, revócala y crea otra.
              </DialogDescription>
            </DialogHeader>
            <InputGroup>
              <InputGroupInput
                value={secret}
                readOnly
                aria-label="Llave de API"
                className="font-mono"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={copySecret}>
                  {copied ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <CopyIcon data-icon="inline-start" />
                  )}
                  {copied ? "Copiada" : "Copiar"}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <DialogFooter>
              <DialogClose render={<Button />}>Listo</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onCreate} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Nueva llave</DialogTitle>
              <DialogDescription>
                Las llaves de pruebas envían a la habilitación de la DIAN.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="api-key-name">Nombre</FieldLabel>
                    <Input
                      {...field}
                      id="api-key-name"
                      placeholder="ERP de producción"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="environment"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="api-key-environment">Ambiente</FieldLabel>
                    <Select
                      items={environmentItems}
                      name={field.name}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger
                        id="api-key-environment"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                        onBlur={field.onBlur}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {environmentItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />} disabled={isSubmitting}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting ? "Creando…" : "Crear llave"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
