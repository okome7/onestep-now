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
  await expect(
    page.getByLabel("パスワード確認", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "登録" })).toBeVisible();
});

test("パスワードの表示と非表示を切り替えられる", async ({ page }) => {
  await page.goto("/");

  const passwordInput = page.getByPlaceholder("パスワードを入力");
  const toggleButton = page.getByRole("button", {
    name: "パスワードを表示する",
  });

  await expect(passwordInput).toHaveAttribute("type", "password");
  await toggleButton.click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "パスワードを非表示にする" }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");
});

test("パスワードに英数字以外は入力できない", async ({ page }) => {
  await page.goto("/");

  const passwordInput = page.getByPlaceholder("パスワードを入力");
  const confirmationInput = page.getByPlaceholder("パスワード確認を入力");

  await passwordInput.fill("あああabc123");
  await confirmationInput.fill("テストpass456");

  await expect(passwordInput).toHaveValue("abc123");
  await expect(confirmationInput).toHaveValue("pass456");
});

test("入力エラーをフォーム内に表示する", async ({ page }) => {
  await page.goto("/");

  const submitButton = page.getByRole("button", { name: "登録" });
  const beforeSubmitBox = await submitButton.boundingBox();

  await page.getByLabel("名前").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await submitButton.click();

  await expect(
    page.getByText("@を含む正しいメールアドレスを入力してください"),
  ).toBeVisible();
  const afterSubmitBox = await submitButton.boundingBox();

  expect(afterSubmitBox?.y).toBeCloseTo(beforeSubmitBox?.y ?? 0, 0);
  await expect(page.getByLabel("メールアドレス")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
