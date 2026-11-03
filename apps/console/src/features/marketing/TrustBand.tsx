import { useQuery } from "@tanstack/react-query";

import { statusPageUrl } from "~/features/status/links";
import { formatCount } from "~/features/usage/labels";

import { acceptedDocumentsMin } from "./figures";
import { landingFiguresQuery } from "./queries";

/** Real production figures from the API, shown once they are worth showing. */
export function TrustBand() {
  const { data: figures } = useQuery(landingFiguresQuery);
  if (!figures || figures.acceptedDocuments < acceptedDocumentsMin) {
    return null;
  }
  const stats = [
    { value: formatCount(figures.acceptedDocuments), label: "documentos aceptados por la DIAN" },
    {
      value: formatCount(figures.activeIssuers),
      label: "empresas facturando en los últimos 90 días",
    },
  ];
  return (
    <section aria-label="Cetus en producción" className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-6">
        <dl className="flex flex-col gap-8 sm:flex-row sm:gap-16">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-1">
              <dt className="text-md text-muted-foreground">{stat.label}</dt>
              <dd className="font-heading text-4xl font-medium tracking-heading tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        <a href={statusPageUrl} className="text-md font-medium underline underline-offset-4">
          Ver la disponibilidad del servicio
        </a>
      </div>
    </section>
  );
}
