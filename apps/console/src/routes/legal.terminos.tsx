import { createFileRoute } from "@tanstack/react-router";

import { legalDocuments } from "~/features/legal/documents";
import { LegalPage } from "~/features/legal/LegalPage";
import { TermsOfService } from "~/features/legal/TermsOfService";

export const Route = createFileRoute("/legal/terminos")({
  head: () => ({ meta: [{ title: `${legalDocuments.terms.title} · Cetus` }] }),
  component: () => (
    <LegalPage title={legalDocuments.terms.title} version={legalDocuments.terms.version}>
      <TermsOfService />
    </LegalPage>
  ),
});
