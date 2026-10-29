import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UsersIcon } from "lucide-react";
import { useState } from "react";

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
import { CatalogSearch, LoadMore } from "~/features/catalog/CatalogList";
import { CustomerDialog } from "~/features/catalog/CustomerDialog";
import { DeleteEntry } from "~/features/catalog/DeleteEntry";
import { customerPagesQuery } from "~/features/catalog/queries";
import { deleteCustomer } from "~/features/catalog/server";
import { identificationTypeLabel } from "~/features/documents/labels";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import { useSettled } from "~/lib/useSettled";

export const Route = createFileRoute("/_app/catalog/customers")({
  loader: async ({ context: { queryClient } }) => {
    const environment = await queryClient.query({ ...activeEnvironmentQuery, staleTime: "static" });
    await queryClient.infiniteQuery({
      ...customerPagesQuery(environment, ""),
      staleTime: "static",
    });
  },
  component: Customers,
});

function Customers() {
  const environment = useActiveEnvironment();
  const [text, setText] = useState("");
  const q = useSettled(text.trim(), 300);
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    ...customerPagesQuery(environment, q),
    placeholderData: keepPreviousData,
  });
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <CatalogHeader action={<CustomerDialog environment={environment} />} />
      {items.length === 0 && q === "" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes clientes guardados</EmptyTitle>
            <EmptyDescription>
              Crea uno aquí, o marca «Guardar este cliente» al emitir una factura para tenerlo a
              mano la próxima vez. También puedes guardarlos con la API en{" "}
              <code>/v1/customers</code>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <section className="flex flex-col gap-4" aria-label="Catálogo de clientes">
          <CatalogSearch
            value={text}
            placeholder="Buscar por nombre o documento"
            onChange={setText}
          />
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-5">Nombre o razón social</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead className="w-20 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-20 text-center text-xs text-muted-foreground"
                    >
                      Ningún resultado para «{q}».
                    </TableCell>
                  </TableRow>
                )}
                {items.map((customer) => (
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
                      <div className="flex justify-end">
                        <CustomerDialog environment={environment} customer={customer} />
                        <DeleteEntry
                          label={customer.legalName}
                          remove={() => deleteCustomer({ data: { environment, id: customer.id } })}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <LoadMore
            hasMore={hasNextPage}
            loading={isFetchingNextPage}
            onLoad={() => void fetchNextPage()}
          />
        </section>
      )}
    </>
  );
}
