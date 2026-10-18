import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "~/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { createApiKey, listApiKeys, revokeApiKey } from "~/features/api-keys/server";
import { createApiKeySchema } from "~/features/api-keys/schema";
import type { ApiKey, Environment } from "~/lib/api/types";

export const Route = createFileRoute("/_app/developers/api-keys")({
  loader: () => listApiKeys(),
  component: ApiKeys,
});

const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

const environmentItems: { label: string; value: Environment }[] = [
  { label: "Pruebas (habilitación DIAN)", value: "TEST" },
  { label: "Producción", value: "LIVE" },
];

function ApiKeys() {
  const keys = Route.useLoaderData();
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm({
    resolver: arktypeResolver(createApiKeySchema),
    defaultValues: { name: "", environment: "TEST" as Environment },
  });
  const { isSubmitting } = form.formState;

  const onCreate = form.handleSubmit(async (values) => {
    const created = await createApiKey({ data: values });
    setSecret(created.secret);
    setCopied(false);
    form.reset();
    await router.invalidate();
  });

  async function copySecret() {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    }
  }

  return (
    <>
      <PageHeader
        title="Llaves de API"
        lead={
          <>
            Cada llave pertenece a un ambiente. Úsala en el encabezado <code>Authorization: Bearer …</code>.
          </>
        }
      />

      {secret && (
        <Alert aria-live="polite">
          <KeyRoundIcon />
          <AlertTitle>Copia tu llave ahora</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>Por seguridad solo la mostramos una vez. Si la pierdes, revócala y crea otra.</p>
            <InputGroup>
              <InputGroupInput value={secret} readOnly aria-label="Llave de API" className="font-mono" />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={copySecret}>
                  {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
                  {copied ? "Copiada" : "Copiar"}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nueva llave</CardTitle>
          <CardDescription>Las llaves de pruebas envían a la habilitación de la DIAN.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} noValidate>
            <FieldGroup className="md:flex-row md:items-start">
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
              <Field className="md:w-auto md:pt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner data-icon="inline-start" />}
                  {isSubmitting ? "Creando…" : "Crear llave"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus llaves</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <KeyRoundIcon />
                </EmptyMedia>
                <EmptyTitle>Todavía no hay llaves</EmptyTitle>
                <EmptyDescription>Crea una de pruebas para empezar a integrar.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Llave</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} className={key.revokedAt ? "text-muted-foreground" : undefined}>
                    <TableCell>{key.name}</TableCell>
                    <TableCell>
                      <code>{key.prefix}…</code>
                    </TableCell>
                    <TableCell>
                      <EnvironmentBadge environment={key.environment} />
                    </TableCell>
                    <TableCell>{key.lastUsedAt ? dateFormat.format(new Date(key.lastUsedAt)) : "Nunca"}</TableCell>
                    <TableCell className="text-right">
                      {key.revokedAt ? (
                        <Badge variant="outline">Revocada</Badge>
                      ) : (
                        <RevokeApiKey apiKey={key} onRevoked={() => router.invalidate()} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function RevokeApiKey({ apiKey, onRevoked }: { apiKey: ApiKey; onRevoked: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function revoke() {
    setPending(true);
    try {
      await revokeApiKey({ data: { id: apiKey.id } });
      await onRevoked();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>Revocar</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Revocar la llave "{apiKey.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Las integraciones que la usen dejarán de funcionar. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={revoke} disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Revocar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
