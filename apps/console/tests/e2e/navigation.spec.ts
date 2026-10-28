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

test("on a short window the collapsed sidebar scrolls to its last links", async ({
  page,
  organization: _,
}) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await open(page, "/overview");
  await page.getByRole("main").getByRole("button", { name: "Mostrar u ocultar menú" }).click();
  await expect(page.locator("[data-slot=sidebar][data-state]")).toHaveAttribute(
    "data-state",
    "collapsed",
  );

  const navigation = page.getByRole("navigation", { name: "Principal" });
  await navigation.hover();
  await page.mouse.wheel(0, 1000);
  await expect(navigation.getByRole("link", { name: "Seguridad" })).toBeInViewport({ ratio: 1 });
});

test("the settings pages sit under the organization group", async ({ page, organization: _ }) => {
  await open(page, "/settings/members");
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();

  await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Organización");
  await expect(page.getByRole("button", { name: /Pruebas SAS/ })).toBeVisible();
});

test("the theme switch keeps the dark theme after a reload", async ({ page, organization: _ }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page, "/overview");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Cambiar el tema" }).click();
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);
});
