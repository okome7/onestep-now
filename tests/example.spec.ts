import { test, expect } from "@playwright/test";

test("バックエンドのヘルスチェックが成功する", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3001/up");

  expect(response.status()).toBe(200);
});

test("フロントエンドの新規登録画面が表示される", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
  await expect(page.getByPlaceholder("名前を入力")).toBeVisible();
  await expect(page.getByPlaceholder("メールアドレスを入力")).toBeVisible();
  await expect(page.getByPlaceholder("パスワードを入力")).toBeVisible();
  await expect(page.getByPlaceholder("パスワード確認を入力")).toBeVisible();
  await expect(page.getByRole("button", { name: "登録" })).toBeVisible();
});
