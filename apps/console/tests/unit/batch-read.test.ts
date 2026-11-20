import { describe, expect, it } from "vite-plus/test";

import { fileBytesMax, readBatchFile } from "~/features/batches/readBatchFile";

describe("readBatchFile", () => {
  it("refuses a file over 5 MB before reading it", async () => {
    const file = new File([new Uint8Array(fileBytesMax + 1)], "grande.xlsx");
    await expect(readBatchFile(file)).resolves.toMatchObject({
      ok: false,
      message: "El archivo pesa más de 5 MB. Divídelo en varios lotes.",
    });
  });

  it("refuses a file that is neither .xlsx nor .csv", async () => {
    const file = new File(["a"], "facturas.xls");
    await expect(readBatchFile(file)).resolves.toMatchObject({ ok: false });
  });
});
