import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";
import { issuerName } from "~/features/issuers/labels";
import { issuerDetailQuery } from "~/features/issuers/queries";
import { IssuerFields, issuerDefaults } from "~/features/setup/IssuerFields";
import { issuerSchema } from "~/features/setup/schema";
import { updateIssuer } from "~/features/setup/server";
import type { IssuerDetail } from "~/lib/api/types";
import { memberPermissions } from "~/lib/auth/permissions";
import { uuidPattern } from "~/lib/utils";

export const Route = createFileRoute("/_app/issuers/$issuerId_/edit")({
  beforeLoad: ({ context: { session }, params }) => {
    if (!memberPermissions(session.memberRoles).manage) {
      throw redirect({ to: "/issuers/$issuerId", params: { issuerId: params.issuerId } });
    }
  },
  loader: async ({ context: { queryClient }, params }) => {
    if (!uuidPattern.test(params.issuerId)) {
      throw notFound();
    }
    const issuer = await queryClient.ensureQueryData(issuerDetailQuery(params.issuerId));
    if (!issuer) {
      throw notFound();
    }
    return { crumb: issuerName(issuer) };
  },
  component: EditIssuerPage,
});

function EditIssuerPage() {
  const { issuerId } = Route.useParams();
  // The loader already returned notFound for a missing issuer.
  const issuer = useSuspenseQuery(issuerDetailQuery(issuerId)).data!;
  return <EditIssuerForm issuer={issuer} />;
}

/**
 * The issuer's tax data, to keep it in line with its RUT after the setup: a new address, a change
 * of responsibilities or a name written differently. Invoices not yet sent go out with the new data.
 */
function EditIssuerForm({ issuer }: { issuer: IssuerDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const update = useMutation({ mutationFn: updateIssuer });
  const form = useForm({
    resolver: arktypeResolver(issuerSchema),
    defaultValues: issuerDefaults(issuer),
  });
  const { isSubmitting, isDirty, errors } = form.formState;
  const backToIssuer = () =>
    navigate({ to: "/issuers/$issuerId", params: { issuerId: issuer.id } });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isDirty) {
        await update.mutateAsync({ data: { id: issuer.id, issuer: values } });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["issuers"] }),
          queryClient.invalidateQueries({ queryKey: auditLogKey }),
        ]);
      }
      await backToIssuer();
    } catch (error) {
      form.setError("root", { message: (error as Error).message });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-5">
      <Link
        to="/issuers/$issuerId"
        params={{ issuerId: issuer.id }}
        className="flex w-fit items-center gap-1.75 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver al emisor
      </Link>

      <PageHeader
        title="Editar datos tributarios"
        lead={
          issuer.environment === "LIVE"
            ? "Mantén estos datos iguales a los del RUT: las facturas que aún no se han enviado a la DIAN saldrán con los nuevos datos."
            : "Mantén estos datos iguales a los del RUT: la DIAN los compara al validar cada factura."
        }
      />

      <div className="flex flex-col gap-6 rounded-lg border p-4 sm:p-6">
        {errors.root?.message && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        <IssuerFields form={form} issuer={issuer} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={backToIssuer} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
