import { expect, open, test } from "./fixtures";

test("a new account sees its usage on the free plan", async ({ page, organization: _owner }) => {
  await open(page, "/overview");
  await expect(page.getByText(/^Plan Gratis · cuenta/)).toBeVisible();

  await page.getByRole("link", { name: "Plan y uso" }).click();
  await expect(page.getByRole("heading", { name: "Plan y uso" })).toBeVisible();
  await expect(page.getByText("Estás en el plan Gratis")).toBeVisible();
  await expect(page.getByText("25 documentos al mes")).toBeVisible();
  await expect(page.getByText("Hasta 30 al mes; después, solo notas crédito")).toBeVisible();
  await expect(page.getByText("1 por segundo, hasta 10 de una vez")).toBeVisible();
  await expect(page.getByText("0 de 25 documentos")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Últimos seis meses" }).getByRole("row"),
  ).toHaveCount(7);
});
