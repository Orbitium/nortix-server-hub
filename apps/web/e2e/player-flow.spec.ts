import { expect, test } from "@playwright/test";

test("player signs in, browses, joins, and sees progress", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("tester5@example.test");
  await page.locator('input[type="password"]').fill("local-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Campaigns", exact: true }).first().click();
  await page.getByRole("link", { name: "View playtest" }).first().click();
  await page.getByRole("button", { name: "Join campaign" }).click();
  await page.getByLabel("I understand and accept the campaign terms.").check();
  await page.getByRole("button", { name: "Accept & join campaign" }).click();
  await page.getByRole("link", { name: "View your progress" }).click();
  await expect(page.getByRole("heading", { name: "My Progress" })).toBeVisible();
  await expect(page.getByText("First island experience").first()).toBeVisible();
});
