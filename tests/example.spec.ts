import { test, expect } from "@playwright/test";

test("Railsのヘルスチェック(/up)が正常にレスポンスを返す", async ({ page }) => {
  // Rails 8 標準のヘルスチェックエンドポイント
  const response = await page.goto("/up");

  // ステータスコードが 200 であることを確認
  expect(response?.status()).toBe(200);
});

// ↓ いったんトップページのテストはコメントアウト（または削除）
// Rails側でルートパス(root "controller#action")を設定した後に復活させましょう
/*
test("Railsのトップページにアクセスできる", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
});
*/
