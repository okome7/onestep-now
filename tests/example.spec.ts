import { test, expect } from "@playwright/test";

test("Railsのヘルスチェックが通る", async ({ page }) => {
  // 1. /up にアクセスしてレスポンスを取得
  const response = await page.goto("/up");

  // 2. ステータスコードが 200 (Success) であることを確認
  // これが最強にシンプルで確実なヘルスチェックです
  expect(response?.status()).toBe(200);
});

test("Railsのトップページにアクセスできる", async ({ page }) => {
  // Rails 8 のデフォルト画面（Welcome画面）が出るはずなので 200 を期待
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  // URLが正しいことも一応チェック
  expect(page.url()).toBe("http://localhost:3000/");
});
