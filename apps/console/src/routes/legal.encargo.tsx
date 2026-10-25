import { createFileRoute } from "@tanstack/react-router";

import { DataProcessingAgreement } from "~/features/legal/DataProcessingAgreement";
import { legalDocuments } from "~/features/legal/documents";
import { LegalPage } from "~/features/legal/LegalPage";

const title = "Acuerdo de encargo de datos personales";

/** An annex of the terms: it shares their version. */
export const Route = createFileRoute("/legal/encargo")({
  head: () => ({ meta: [{ title: `${title} · Cetus` }] }),
  component: () => (
    <LegalPage title={title} version={legalDocuments.terms.version}>
      <DataProcessingAgreement />
    </LegalPage>
  ),
});
