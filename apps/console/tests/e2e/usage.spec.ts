import { expect, open, test } from "./fixtures";

test("a new account sees its usage without a plan", async ({ page, organization: _owner }) => {
  await open(page, "/overview");
  await expect(page.getByText(/^Sin plan · cuenta/)).toBeVisible();

  await page.getByRole("link", { name: "Plan y uso" }).click();
  await expect(page.getByRole("heading", { name: "Plan y uso" })).toBeVisible();
  await expect(page.getByText("Aún no tienes un plan")).toBeVisible();
  await expect(page.getByText("Sin límite de documentos")).toBeVisible();
  await expect(page.getByText(/^0 documentos facturables en/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Últimos seis meses" }).getByRole("row"),
  ).toHaveCount(7);
});
