import { useMutation } from "@tanstack/react-query";
import { ChevronDownIcon, DownloadIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Spinner } from "~/components/ui/spinner";
import type { DocumentFile } from "~/lib/api/types";

import { getDocumentFileUrl } from "./server";

const files: { file: DocumentFile; label: string }[] = [
  { file: "pdf", label: "PDF" },
  { file: "xml", label: "XML" },
  { file: "attached-document", label: "AttachedDocument" },
];

/**
 * The document's files. Each click asks for a fresh presigned URL, which lives a few minutes and downloads
 * the file under its DIAN name.
 */
export function DocumentDownloads({ documentId }: { documentId: string }) {
  const download = useMutation({
    mutationFn: (file: DocumentFile) => getDocumentFileUrl({ data: { id: documentId, file } }),
    onSuccess: (result) => {
      if (result.url) {
        window.location.assign(result.url);
      }
    },
  });
  const message =
    download.data && download.data.url === null
      ? download.data.message
      : download.isError
        ? "No se pudo obtener el archivo. Intenta de nuevo."
        : null;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="group" disabled={download.isPending} />}
        >
          {download.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          Descargar
          <ChevronDownIcon
            data-icon="inline-end"
            className="transition-transform group-data-popup-open:rotate-180"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          {files.map(({ file, label }) => (
            <DropdownMenuItem key={file} onClick={() => download.mutate(file)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {message && <output className="text-2xs text-muted-foreground">{message}</output>}
    </div>
  );
}
