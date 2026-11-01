import { DocumentDownloads } from "~/features/documents/DocumentDownloads";
import type { OrderInvoice } from "~/lib/api/types";

import { getOrderCreditNoteFileUrl, getOrderInvoiceFileUrl } from "./server";

/**
 * The number of Cetus' invoice of an order, or of a credit note over it when `creditNoteId` is given, and its files
 * once the DIAN accepted it.
 */
export function OrderInvoiceDownloads({
  orderId,
  invoice,
  creditNoteId,
}: {
  orderId: string;
  invoice: OrderInvoice;
  creditNoteId?: string;
}) {
  return invoice.status === "ACCEPTED" ? (
    <div className="flex items-center gap-3">
      <span className="tabular-nums">{invoice.number}</span>
      <DocumentDownloads
        getUrl={(file) =>
          creditNoteId
            ? getOrderCreditNoteFileUrl({ data: { id: orderId, documentId: creditNoteId, file } })
            : getOrderInvoiceFileUrl({ data: { id: orderId, file } })
        }
      />
    </div>
  ) : (
    <span className="text-muted-foreground">{`${invoice.number} · en proceso`}</span>
  );
}
