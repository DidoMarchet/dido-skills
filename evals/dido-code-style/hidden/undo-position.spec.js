import { expect, test } from "@playwright/test";

test("Annulla rimette la nota al suo posto", async ({ page }) => {
  await page.goto("/");
  for (const text of ["Prima", "Seconda", "Terza"]) {
    await page.getByLabel("Nuova nota").fill(text);
    await page.getByRole("button", { name: "Aggiungi" }).click();
  }
  await page.getByRole("button", { name: "Elimina Seconda" }).click();
  await page.getByRole("button", { name: "Annulla" }).click();
  await expect(page.locator("#notes li span")).toHaveText(["Prima", "Seconda", "Terza"]);
});
