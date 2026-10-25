import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { type LegalDocument, legalDocuments } from "./documents";

/** Opens the document in a new tab, so a form being filled in keeps its values. */
export function LegalLink({
  document,
  children,
}: {
  document: LegalDocument;
  children: ReactNode;
}) {
  return (
    <Link
      to={legalDocuments[document].path}
      target="_blank"
      className="font-medium text-foreground underline underline-offset-4"
    >
      {children}
    </Link>
  );
}
