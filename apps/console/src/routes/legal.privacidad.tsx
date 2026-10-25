import { createFileRoute } from "@tanstack/react-router";

import { legalDocuments } from "~/features/legal/documents";
import { LegalPage } from "~/features/legal/LegalPage";
import { PrivacyPolicy } from "~/features/legal/PrivacyPolicy";

export const Route = createFileRoute("/legal/privacidad")({
  head: () => ({ meta: [{ title: `${legalDocuments.privacy.title} · Cetus` }] }),
  component: () => (
    <LegalPage title={legalDocuments.privacy.title} version={legalDocuments.privacy.version}>
      <PrivacyPolicy />
    </LegalPage>
  ),
});
