import { useMutation } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
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
      <div className="flex flex-wrap gap-2">
        {files.map(({ file, label }) => (
          <Button
            key={file}
            variant="outline"
            size="sm"
            disabled={download.isPending}
            onClick={() => download.mutate(file)}
          >
            {download.isPending && download.variables === file ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <DownloadIcon data-icon="inline-start" />
            )}
            {label}
          </Button>
        ))}
      </div>
      {message && <output className="text-2xs text-muted-foreground">{message}</output>}
    </div>
  );
}
