import { onboardIssuer, uniqueNit } from "../support/issuers";
import { zip } from "../support/zip";
import { expect, open, test } from "./fixtures";

const xml = (text: string) => Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>${text}`, "utf-8");

/** An .xlsx of a few hundred kilobytes whose sheet unzips to hundreds of megabytes. */
function zipBomb() {
  const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const relationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return zip([
    {
      name: "[Content_Types].xml",
      data: xml(
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: xml(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: xml(
        `<workbook xmlns="${main}" xmlns:r="${relationships}"><sheets><sheet name="Facturas" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: xml(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relationships}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: Buffer.concat([
        xml(`<worksheet xmlns="${main}"><sheetData>`),
        Buffer.alloc(400 * 1024 * 1024, " "),
        Buffer.from("</sheetData></worksheet>"),
      ]),
    },
  ]);
}

test("a file that unzips to an enormous sheet is stopped without taking the page down", async ({
  page,
  organization,
}) => {
  test.setTimeout(120_000);
  await onboardIssuer(organization, uniqueNit(), "Lote Bomba SAS", { testSet: false });
  const bomb = zipBomb();
  expect(bomb.length).toBeLessThan(5 * 1024 * 1024);

  await open(page, "/documents/batches/new");
  await page.getByLabel("Archivo de facturas").setInputFiles({
    name: "bomba.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: bomb,
  });

  await expect(page.getByText("No pudimos usar este archivo")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Elegir otro archivo" })).toBeEnabled();
});
