import { FileIcon, UploadIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

import { attachmentAccept, attachmentBytesMax, attachmentsMax } from "./schema";
import { uploadSupportAttachment } from "./server";

export type Attachment =
  | { key: string; fileName: string; status: "uploading" }
  | { key: string; fileName: string; status: "uploaded"; id: string }
  | { key: string; fileName: string; status: "failed"; message: string };

const acceptedTypes = new Set(attachmentAccept.split(","));

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      resolve(url.slice(url.indexOf(",") + 1));
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("No pudimos leer el archivo.")),
    );
    reader.readAsDataURL(file);
  });
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Up to five images or PDFs, each uploaded as soon as it is chosen, so sending the ticket only names
 * them. The API checks their type by their bytes; the checks here only spare a useless upload.
 */
export function AttachmentDropzone({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: readonly Attachment[];
  disabled?: boolean;
  onChange: (update: (current: readonly Attachment[]) => Attachment[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // What happened to the last file, for screen readers: the list changes without moving focus.
  const [announcement, setAnnouncement] = useState("");
  const full = value.length >= attachmentsMax;

  async function upload(key: string, file: File) {
    try {
      const uploaded = await uploadSupportAttachment({
        data: { fileName: file.name, contentBase64: await readBase64(file) },
      });
      onChange((current) =>
        current.map((each) =>
          each.key === key
            ? { key, fileName: file.name, status: "uploaded", id: uploaded.id }
            : each,
        ),
      );
      setAnnouncement(`${file.name} adjuntado.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos subir el archivo.";
      setAnnouncement(`${file.name} no se adjuntó. ${message}`);
      onChange((current) =>
        current.map((each) =>
          each.key === key ? { key, fileName: file.name, status: "failed", message } : each,
        ),
      );
    }
  }

  function add(files: FileList | null) {
    if (!files || disabled) {
      return;
    }
    const room = attachmentsMax - value.length;
    const added: Attachment[] = [];
    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      const key = crypto.randomUUID();
      if (!acceptedTypes.has(file.type)) {
        added.push({
          key,
          fileName: file.name,
          status: "failed",
          message: "Adjunta imágenes JPEG, PNG, GIF o WebP, o archivos PDF.",
        });
      } else if (file.size > attachmentBytesMax) {
        added.push({
          key,
          fileName: file.name,
          status: "failed",
          message: `Pesa ${sizeLabel(file.size)}; el máximo es 5 MB.`,
        });
      } else {
        added.push({ key, fileName: file.name, status: "uploading" });
        void upload(key, file);
      }
    }
    onChange((current) => [...current, ...added]);
    const refused = added.filter((each) => each.status === "failed");
    if (refused.length > 0) {
      setAnnouncement(
        refused.map((each) => `${each.fileName} no se adjuntó. ${each.message}`).join(" "),
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-5 text-center transition-colors",
          dragging && "border-ring bg-accent",
        )}
      >
        <UploadIcon className="size-5 text-muted-foreground" aria-hidden />
        <p className="text-sm">Arrastra archivos aquí o</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || full}
          onClick={() => input.current?.click()}
        >
          Seleccionar archivos
        </Button>
        <p className="text-xs text-muted-foreground">
          Hasta {attachmentsMax} archivos de 5 MB. JPEG, PNG, GIF, WebP o PDF.
        </p>
        <input
          ref={input}
          id={id}
          type="file"
          multiple
          accept={attachmentAccept}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            add(event.target.files);
            // Choosing the same file again must fire onChange again.
            event.target.value = "";
          }}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Adjuntos">
          {value.map((attachment) => (
            <li
              key={attachment.key}
              className="flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm"
            >
              {attachment.status === "uploading" ? (
                <Spinner className="size-4 shrink-0" />
              ) : (
                <FileIcon
                  className={cn(
                    "size-4 shrink-0",
                    attachment.status === "failed" ? "text-destructive" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="break-all">{attachment.fileName}</span>
                {attachment.status === "failed" && (
                  <span className="text-xs text-destructive">{attachment.message}</span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                onClick={() =>
                  onChange((current) => current.filter((each) => each.key !== attachment.key))
                }
              >
                <XIcon />
                <span className="sr-only">Quitar {attachment.fileName}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
