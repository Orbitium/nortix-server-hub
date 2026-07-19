import { expect, test } from "@playwright/test";

test("server owner registers a server and submits a campaign", async ({ page }) => {
  await page.goto("/owner");
  await page.getByRole("link", { name: "Add server" }).click();
  await expect(page.getByRole("heading", { name: "Add a Minecraft Server" })).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Submit ownership evidence/ }).click();
  await expect(page.getByText("Ownership evidence submitted.")).toBeVisible();
  await page.getByRole("link", { name: "Create a draft campaign" }).click();
  for (let step = 0; step < 6; step += 1) {
    await page.getByRole("button", { name: /Continue/ }).click();
  }
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Campaign sent for review.")).toBeVisible();
});
