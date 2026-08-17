import { expect, test } from "@playwright/test";

const sessionRoute = /.*\/(?:api\/)?session$/;
const sessionResponse = {
  status: "success",
  data: null,
};

test("300ms未満の応答ではローディング画面を表示しない", async ({ page }) => {
  await page.route(sessionRoute, async (route) => {
    await route.fulfill({ json: sessionResponse });
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
  await expect(page.getByText("読み込んでいます…")).toHaveCount(0);
});

test("300ms以上かかる場合は通常ローディング画面を表示する", async ({
  page,
}) => {
  await page.route(sessionRoute, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({ json: sessionResponse });
  });

  await page.goto("/");
  await expect(page.getByText("読み込んでいます…")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
});

test("1500msを超えても通常ローディング画面を表示し続ける", async ({ page }) => {
  await page.route(sessionRoute, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await route.fulfill({ json: sessionResponse });
  });

  await page.goto("/");
  await expect(page.getByText("読み込んでいます…")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
});

test("一時的な503後も再試行して通常画面へ遷移する", async ({ page }) => {
  const startedAt = Date.now();

  await page.route(sessionRoute, async (route) => {
    if (Date.now() - startedAt < 1600) {
      await route.fulfill({ status: 503, json: { status: "error" } });
      return;
    }

    await route.fulfill({ json: sessionResponse });
  });

  await page.goto("/");
  await expect(page.getByText("読み込んでいます…")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible({ timeout: 5000 });
});
