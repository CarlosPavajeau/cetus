import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UsersIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { CatalogHeader } from "~/features/catalog/CatalogHeader";
import { DeleteEntry } from "~/features/catalog/DeleteEntry";
import { customersQuery } from "~/features/catalog/queries";
import { deleteCustomer } from "~/features/catalog/server";
import { identificationTypeLabel } from "~/features/documents/labels";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";

export const Route = createFileRoute("/_app/catalog/customers")({
  loader: async ({ context: { queryClient } }) => {
    const environment = await queryClient.ensureQueryData(activeEnvironmentQuery);
    await queryClient.ensureQueryData(customersQuery(environment));
  },
  component: Customers,
});

function Customers() {
  const environment = useActiveEnvironment();
  const { data } = useSuspenseQuery(customersQuery(environment));

  return (
    <>
      <CatalogHeader />
      {data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes clientes guardados</EmptyTitle>
            <EmptyDescription>
              Al emitir una factura, marca «Guardar este cliente» para tenerlo a mano la próxima
              vez. También puedes guardarlos con la API en <code>/v1/customers</code>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-5">Nombre o razón social</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead className="w-12 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="px-5 text-xs font-medium">{customer.legalName}</TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {identificationTypeLabel[customer.identificationType] ??
                      customer.identificationType}{" "}
                    {customer.identificationNumber}
                    {customer.checkDigit && `-${customer.checkDigit}`}
                  </TableCell>
                  <TableCell className="text-xs">{customer.email ?? "—"}</TableCell>
                  <TableCell className="pr-5">
                    <DeleteEntry
                      label={customer.legalName}
                      remove={() => deleteCustomer({ data: { environment, id: customer.id } })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
