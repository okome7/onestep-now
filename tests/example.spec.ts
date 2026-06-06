import { test, expect } from "@playwright/test";

test("バックエンドのヘルスチェックが成功する", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3001/up");

  expect(response.status()).toBe(200);
});

test("フロントエンドの新規登録画面が表示される", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
  await expect(page.getByLabel("名前")).toBeVisible();
  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByLabel("パスワード", { exact: true })).toBeVisible();
  await expect(page.getByLabel("パスワード確認")).toBeVisible();
  await expect(page.getByRole("button", { name: "登録する" })).toBeVisible();
});
