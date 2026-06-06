import { test, expect } from "@playwright/test";

test("backend health check responds successfully", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3001/up");

  expect(response.status()).toBe(200);
});

test("frontend home screen is available without signup", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Get started" })).toBeVisible();
});
