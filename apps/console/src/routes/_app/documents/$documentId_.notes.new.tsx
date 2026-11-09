import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { PageHeader } from "~/components/PageHeader";
import { documentDetailQuery } from "~/features/documents/queries";
import { NoteForm, type NoteType } from "~/features/issuance/NoteForm";
import { noteDraft } from "~/features/issuance/reissue";
import { useBlockedReason } from "~/features/issuance/useBlockedReason";
import { uuidPattern } from "~/lib/utils";

export const Route = createFileRoute("/_app/documents/$documentId_/notes/new")({
  validateSearch: (search: Record<string, unknown>): { type: NoteType; from?: string } => ({
    type: search.type === "DEBIT_NOTE" ? "DEBIT_NOTE" : "CREDIT_NOTE",
    ...(typeof search.from === "string" && uuidPattern.test(search.from)
      ? { from: search.from }
      : {}),
  }),
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context: { queryClient }, params, deps }) => {
    if (!uuidPattern.test(params.documentId)) {
      throw notFound();
    }
    const invoice = await queryClient.query({
      ...documentDetailQuery(params.documentId),
      staleTime: "static",
    });
    // Notes only correct accepted invoices.
    if (!invoice || invoice.documentType !== "INVOICE" || invoice.status !== "ACCEPTED") {
      throw notFound();
    }
    const source = deps.from
      ? await queryClient.query({ ...documentDetailQuery(deps.from), staleTime: "static" })
      : null;
    return {
      crumb: invoice.number,
      environment: invoice.environment,
      // Only a note of this invoice is copied; any other leaves the form empty.
      source: source?.invoice?.id === invoice.id ? source : null,
    };
  },
  component: NewNote,
});

function NewNote() {
  const { documentId } = Route.useParams();
  const { type: noteType } = Route.useSearch();
  const { source } = Route.useLoaderData();
  const { data: invoice } = useSuspenseQuery(documentDetailQuery(documentId));
  // The loader already checked it is an accepted invoice; it is only missing if it vanished since.
  if (!invoice) {
    throw notFound();
  }
  const blockedReason = useBlockedReason(invoice.environment);
  const noun = noteType === "CREDIT_NOTE" ? "nota crédito" : "nota débito";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Link
        to="/documents/$documentId"
        params={{ documentId }}
        className="flex w-fit items-center gap-1.75 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Factura {invoice.number}
      </Link>
      <PageHeader
        title={`Emitir ${noun}`}
        lead={`Corrige la factura ${invoice.number} de ${invoice.customer.legalName}.`}
      />
      {/* Remounted per type, so the concept and the key never carry over. */}
      <NoteForm
        key={noteType}
        invoice={invoice}
        noteType={noteType}
        draft={source && noteDraft(source, noteType)}
        blockedReason={blockedReason}
      />
    </div>
  );
}
