import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PackageIcon } from "lucide-react";

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
import { CreateProduct } from "~/features/catalog/CreateProduct";
import { DeleteEntry } from "~/features/catalog/DeleteEntry";
import { productsQuery } from "~/features/catalog/queries";
import { presetOf } from "~/features/catalog/schema";
import { deleteProduct } from "~/features/catalog/server";
import { formatMoney } from "~/features/documents/labels";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import { taxPresets } from "~/features/issuance/catalogs";
import type { Product } from "~/lib/api/types";

export const Route = createFileRoute("/_app/catalog/products")({
  loader: async ({ context: { queryClient } }) => {
    const environment = await queryClient.ensureQueryData(activeEnvironmentQuery);
    await queryClient.ensureQueryData(productsQuery(environment));
  },
  component: Products,
});

/** The tax by its preset name; a combination saved through the API is listed as it is. */
function taxLabel(product: Product) {
  const preset = presetOf(product.taxes);
  if (preset) {
    return taxPresets[preset].label;
  }
  return product.taxes.map((tax) => `${tax.type} ${tax.percent} %`).join(" + ");
}

function Products() {
  const environment = useActiveEnvironment();
  const { data } = useSuspenseQuery(productsQuery(environment));

  return (
    <>
      <CatalogHeader action={<CreateProduct environment={environment} />} />
      {data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes productos guardados</EmptyTitle>
            <EmptyDescription>
              Guarda lo que vendes con su precio e impuesto, y agrégalo a tus facturas con un clic.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-5">Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Impuesto</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="w-12 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="px-5 text-xs font-medium">{product.code}</TableCell>
                  <TableCell className="text-xs">{product.description}</TableCell>
                  <TableCell className="text-xs">{taxLabel(product)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatMoney(product.unitPrice, "COP")}
                  </TableCell>
                  <TableCell className="pr-5">
                    <DeleteEntry
                      label={product.description}
                      remove={() => deleteProduct({ data: { environment, id: product.id } })}
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
