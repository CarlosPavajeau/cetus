import type { ParsedFile } from "./parse";

/** Larger than any template with its limits: a bigger file is refused before it is unzipped. */
export const fileBytesMax = 5 * 1024 * 1024;

/** A file that takes longer than this to read is not a spreadsheet anyone filled in: the reader stops. */
const readTimeoutMs = 30_000;

export type ReadFile = ParsedFile & { fileName: string; sha256: string };

/** Reads the .xlsx or .csv in a Web Worker, so a crafted file cannot touch the page, and hashes it. */
export async function readBatchFile(file: File): Promise<ReadFile> {
  const fileName = file.name;
  if (!/\.(xlsx|csv)$/i.test(fileName)) {
    return {
      ok: false,
      message: "Sube la plantilla en .xlsx o un archivo .csv.",
      fileName,
      sha256: "",
    };
  }
  if (file.size > fileBytesMax) {
    return {
      ok: false,
      message: "El archivo pesa más de 5 MB. Divídelo en varios lotes.",
      fileName,
      sha256: "",
    };
  }
  const [parsed, sha256] = await Promise.all([inWorker(file), digest(file)]);
  return { ...parsed, fileName, sha256 };
}

function inWorker(file: File): Promise<ParsedFile> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./read.worker.ts", import.meta.url), { type: "module" });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        ok: false,
        message: "Leer el archivo tardó demasiado. Revisa que sea la plantilla.",
      });
    }, readTimeoutMs);
    worker.addEventListener("message", (event: MessageEvent<ParsedFile>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    });
    worker.addEventListener("error", () => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ok: false, message: "No pudimos leer el archivo. Revisa que sea la plantilla." });
    });
    worker.postMessage(file, []);
  });
}

async function digest(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
