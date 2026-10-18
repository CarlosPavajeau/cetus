import { UploadIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** A PKCS#12 bundle is a few kilobytes; anything much larger is not a certificate. */
const maxBytes = 1024 * 1024;

/**
 * Picks the .p12 by dragging it in or from the file dialog, and hands it over in base64 so the
 * server function can forward it to the API as is.
 */
export function CertificateDropzone({
  id,
  fileName,
  invalid,
  onSelect,
  onError,
}: {
  id: string;
  fileName: string;
  invalid: boolean;
  onSelect: (file: { fileName: string; pkcs12Base64: string }) => void;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function read(file: File | undefined) {
    if (!file) {
      return;
    }
    if (!/\.(p12|pfx)$/i.test(file.name)) {
      onError("Selecciona un archivo con extensión .p12.");
      return;
    }
    if (file.size > maxBytes) {
      onError("El archivo es demasiado grande para ser un certificado .p12.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    onSelect({ fileName: file.name, pkcs12Base64: btoa(binary) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void read(event.dataTransfer.files[0]);
        }}
        aria-invalid={invalid}
        className={cn(
          "flex min-h-54.5 flex-col items-center justify-center gap-3.5 rounded-md border border-dashed bg-sidebar p-6 text-center transition-colors",
          dragging && "border-ring bg-accent",
          invalid && "border-destructive",
        )}
      >
        <UploadIcon className="size-6.5 text-muted-foreground" aria-hidden />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm">Arrastra tu archivo .p12 aquí</p>
          <p className="text-2xs text-muted-foreground">o selecciónalo desde tu equipo</p>
        </div>
        <Button type="button" variant="outline" onClick={() => input.current?.click()}>
          Seleccionar archivo .p12
        </Button>
        <input
          ref={input}
          id={id}
          type="file"
          accept=".p12,.pfx,application/x-pkcs12"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            void read(event.target.files?.[0]);
            // Choosing the same file again must fire onChange again.
            event.target.value = "";
          }}
        />
      </div>
      <p className="text-2xs text-muted-foreground" aria-live="polite">
        {fileName ? `Archivo seleccionado: ${fileName}` : "Ningún archivo seleccionado."}
      </p>
    </div>
  );
}
