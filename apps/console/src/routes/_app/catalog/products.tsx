import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PackageIcon } from "lucide-react";
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
import { DeleteEntry } from "~/features/catalog/DeleteEntry";
import { ProductDialog } from "~/features/catalog/ProductDialog";
import { productPagesQuery } from "~/features/catalog/queries";
import { presetOf } from "~/features/catalog/schema";
import { deleteProduct } from "~/features/catalog/server";
import { formatMoney } from "~/features/documents/labels";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import { taxPresets } from "~/features/issuance/catalogs";
import type { Product } from "~/lib/api/types";
import { useSettled } from "~/lib/useSettled";

export const Route = createFileRoute("/_app/catalog/products")({
  loader: async ({ context: { queryClient } }) => {
    const environment = await queryClient.query({ ...activeEnvironmentQuery, staleTime: "static" });
    await queryClient.infiniteQuery({ ...productPagesQuery(environment, ""), staleTime: "static" });
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
  const [text, setText] = useState("");
  const q = useSettled(text.trim(), 300);
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    ...productPagesQuery(environment, q),
    placeholderData: keepPreviousData,
  });
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <CatalogHeader action={<ProductDialog environment={environment} />} />
      {items.length === 0 && q === "" ? (
        <Empty>
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
        <section className="flex flex-col gap-4" aria-label="Catálogo de productos">
          <CatalogSearch
            value={text}
            placeholder="Buscar por código o descripción"
            onChange={setText}
          />
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-5">Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="w-20 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-20 text-center text-xs text-muted-foreground"
                    >
                      Ningún resultado para «{q}».
                    </TableCell>
                  </TableRow>
                )}
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="px-5 text-xs font-medium">{product.code}</TableCell>
                    <TableCell className="text-xs">{product.description}</TableCell>
                    <TableCell className="text-xs">{taxLabel(product)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatMoney(product.unitPrice, "COP")}
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end">
                        <ProductDialog environment={environment} product={product} />
                        <DeleteEntry
                          label={product.description}
                          remove={() => deleteProduct({ data: { environment, id: product.id } })}
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
