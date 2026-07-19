import { expect, test } from "@playwright/test";

test("moderator reviews and approves a campaign", async ({ page }) => {
  await page.goto("/admin/campaigns");
  await expect(page.getByRole("heading", { name: "Campaign Review Queue" })).toBeVisible();
  await page.getByRole("button", { name: "Open review" }).first().click();
  await expect(page.getByRole("heading", { name: "Review campaign" })).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("heading", { name: "Review campaign" })).not.toBeVisible();
});
