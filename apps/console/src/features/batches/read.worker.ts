import readXlsxFile, { InvalidInputError } from "read-excel-file/web-worker";

import { parseCsv, parseWorkbook, toCell, type ParsedFile } from "./parse";

// Reads the file away from the page: a reader fooled by a crafted file never reaches the DOM nor the session.

self.addEventListener("message", (event: MessageEvent<File>) => {
  void read(event.data).then((result) => self.postMessage(result, { transfer: [] }));
});

async function read(file: File): Promise<ParsedFile> {
  try {
    if (/\.csv$/i.test(file.name)) {
      return parseCsv(await file.text());
    }
    const sheets = await readXlsxFile(file);
    return parseWorkbook(
      sheets.map(({ sheet, data }) => ({ sheet, data: data.map((row) => row.map(toCell)) })),
    );
  } catch (error) {
    if (error instanceof InvalidInputError) {
      return {
        ok: false,
        message:
          error.code === "XLS_FILE_NOT_SUPPORTED"
            ? "El archivo es de Excel 97-2003 (.xls). Guárdalo como .xlsx y súbelo de nuevo."
            : "No pudimos leer el archivo como Excel (.xlsx). Revisa que no esté dañado.",
      };
    }
    return {
      ok: false,
      message: "No pudimos leer el archivo. Revisa que sea la plantilla en .xlsx o un .csv.",
    };
  }
}
