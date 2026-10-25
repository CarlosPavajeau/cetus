import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PageHeader } from "~/components/PageHeader";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import { useActiveEnvironment } from "~/features/environment/queries";

/** Header shared by the catalog pages, with the link to the other one. */
export function CatalogHeader({ action }: { action?: ReactNode }) {
  const environment = useActiveEnvironment();
  return (
    <>
      <PageHeader
        title="Catálogo"
        lead={`Clientes y productos guardados en ${environmentLabel[environment].toLowerCase()} para llenar tus facturas. Cada ambiente tiene su propio catálogo.`}
        action={action}
      />
      <nav aria-label="Catálogo" className="flex gap-4 border-b text-sm">
        {(
          [
            { to: "/catalog/customers", label: "Clientes" },
            { to: "/catalog/products", label: "Productos" },
          ] as const
        ).map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="-mb-px border-b-2 border-transparent pb-2 text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
