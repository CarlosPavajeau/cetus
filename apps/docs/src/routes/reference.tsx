import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { FlaskConicalIcon } from "lucide-react";
import { lazy, Suspense } from "react";

import { baseOptions } from "~/lib/layout";

const ApiReference = lazy(() => import("~/components/ApiReference"));

export const Route = createFileRoute("/reference")({
  component: ReferencePage,
  head: () => ({
    meta: [
      { title: "Referencia de la API · Cetus" },
      {
        name: "description",
        content:
          "Endpoints, campos, errores y ejemplos de la API de facturación electrónica de Cetus.",
      },
    ],
  }),
});

function ReferencePage() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
        <span className="flex items-center gap-2">
          <FlaskConicalIcon className="size-4 shrink-0" />
          <span>
            Prueba las peticiones solo con una llave de simulación (<code>cetus_sandbox_…</code>).
            Nunca pegues una llave <code>live</code> en una página web.
          </span>
        </span>
        <span className="flex gap-4">
          <a href="/cetus.postman_collection.json" download className="font-medium underline">
            Colección de Postman
          </a>
          <a href="/openapi.public.json" download className="font-medium underline">
            OpenAPI
          </a>
        </span>
      </div>
      <ClientOnly
        fallback={<p className="p-6 text-sm text-fd-muted-foreground">Cargando la referencia…</p>}
      >
        <Suspense>
          <ApiReference />
        </Suspense>
      </ClientOnly>
    </HomeLayout>
  );
}
