import { useMutation } from "@tanstack/react-query";
import { ChevronDownIcon, DownloadIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Spinner } from "~/components/ui/spinner";
import type { DocumentFile } from "~/lib/api/types";

import type { DocumentFileUrl } from "./server";

const technicalFiles: { file: DocumentFile; label: string }[] = [
  { file: "xml", label: "XML" },
  { file: "attached-document", label: "AttachedDocument" },
];

/**
 * The document's files: the PDF most people want, and the XML files an integration or the DIAN asks for.
 * Each click asks for a fresh presigned URL, which lives a few minutes and downloads the file under its DIAN
 * name.
 */
export function DocumentDownloads({
  getUrl,
}: {
  getUrl: (file: DocumentFile) => Promise<DocumentFileUrl>;
}) {
  const download = useMutation({
    mutationFn: getUrl,
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
  const pdfPending = download.isPending && download.variables === "pdf";

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <ButtonGroup aria-label="Descargar archivos">
        <Button
          variant="outline"
          disabled={download.isPending}
          onClick={() => download.mutate("pdf")}
        >
          {pdfPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          Descargar PDF
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="group"
                disabled={download.isPending}
                aria-label="Otros archivos"
              />
            }
          >
            {download.isPending && !pdfPending ? (
              <Spinner />
            ) : (
              <ChevronDownIcon className="transition-transform group-data-popup-open:rotate-180" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto">
            {technicalFiles.map(({ file, label }) => (
              <DropdownMenuItem key={file} onClick={() => download.mutate(file)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      {message && <output className="text-2xs text-muted-foreground">{message}</output>}
    </div>
  );
}
