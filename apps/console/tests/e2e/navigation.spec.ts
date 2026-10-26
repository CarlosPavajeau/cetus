import { expect, open, test } from "./fixtures";

test("on a phone the sidebar closes once a link opens another page", async ({
  page,
  organization: _,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/overview");

  await page.getByRole("main").getByRole("button", { name: "Mostrar u ocultar menú" }).click();
  const sidebar = page.getByRole("dialog", { name: "Navegación" });
  await expect(sidebar).toBeVisible();

  await sidebar.getByRole("link", { name: "Documentos" }).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(sidebar).toBeHidden();
});

test("the sidebar stays collapsed to icons after a reload", async ({ page, organization: _ }) => {
  await open(page, "/overview");
  const sidebar = page.locator("[data-slot=sidebar][data-state]");
  await expect(sidebar).toHaveAttribute("data-state", "expanded");

  await page.getByRole("main").getByRole("button", { name: "Mostrar u ocultar menú" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsible", "icon");

  await open(page, "/documents");
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect(
    page.getByLabel("Principal").getByRole("link", { name: "Documentos" }),
  ).toHaveAttribute("data-active");
});

test("the settings pages sit under the organization group", async ({ page, organization: _ }) => {
  await open(page, "/settings/members");

  await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Organización");
  await expect(page.getByRole("button", { name: /Pruebas SAS/ })).toBeVisible();
});
