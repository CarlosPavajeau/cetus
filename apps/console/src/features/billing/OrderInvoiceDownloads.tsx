import { DocumentDownloads } from "~/features/documents/DocumentDownloads";
import type { OrderInvoice } from "~/lib/api/types";

import { getOrderInvoiceFileUrl } from "./server";

/** The number of Cetus' invoice of an order, and its files once the DIAN accepted it. */
export function OrderInvoiceDownloads({
  orderId,
  invoice,
}: {
  orderId: string;
  invoice: OrderInvoice;
}) {
  return invoice.status === "ACCEPTED" ? (
    <div className="flex items-center gap-3">
      <span className="tabular-nums">{invoice.number}</span>
      <DocumentDownloads
        getUrl={(file) => getOrderInvoiceFileUrl({ data: { id: orderId, file } })}
      />
    </div>
  ) : (
    <span className="text-muted-foreground">{`${invoice.number} · en proceso`}</span>
  );
}
