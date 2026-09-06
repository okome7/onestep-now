import { expect, type Page, test } from "@playwright/test";

type Account = {
  email: string;
  password: string;
};

const registerAccount = async (page: Page, account: Account) => {
  await page.goto("/");
  await page.getByRole("link", { name: "新規登録" }).click();
  await page.getByLabel("表示名").fill("主要フローユーザー");
  await page.getByLabel("メールアドレス").fill(account.email);
  await page.getByLabel("パスワード", { exact: true }).fill(account.password);
  await page
    .getByLabel("パスワード確認", { exact: true })
    .fill(account.password);
  await page.getByRole("button", { name: "登録" }).click();

  await expect(
    page.getByRole("heading", { name: "アイコンを選ぼう！" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "アイコン2" }).click();
  await page.getByRole("button", { name: "決定" }).click();
  await expect(
    page.getByRole("heading", { name: "登録が完了しました！" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "最初の一歩を始める" }).click();
};

const logIn = async (page: Page, account: Account) => {
  await page.getByLabel("メールアドレス").fill(account.email);
  await page.getByLabel("パスワード").fill(account.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/home$/);
};

const logOut = async (page: Page) => {
  await page.getByRole("button", { name: "設定" }).click();
  await page.getByRole("button", { name: "ログアウト" }).click();
  await page
    .getByRole("dialog", { name: "ログアウトしますか？" })
    .getByRole("button", { name: "ログアウト" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
};

test("@critical 登録からタスク完了とフィード・マイページ確認を経てログアウトできる", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  const suffix = `${testInfo.project.name}-${Date.now()}`.replace(
    /[^a-z0-9-]/gi,
    "-",
  );
  const account = {
    email: `critical-${suffix}@example.com`,
    password: "password1",
  };
  const taskTitle = `主要フロー ${suffix}`;

  await registerAccount(page, account);

  await page.getByRole("link", { name: "プロフィール" }).click();
  await logOut(page);

  await logIn(page, account);
  await page.evaluate(() => {
    localStorage.setItem("onestep-feed-intro-seen", "true");
  });
  await page.getByRole("textbox", { name: "今できること" }).fill(taskTitle);
  await page.getByRole("button", { name: "始める" }).click();
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
  await page.getByRole("button", { name: "できた！" }).click();
  await expect(page.getByRole("heading", { name: "よくできた" })).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await page.getByRole("link", { name: "みんなを見る" }).click();
  const introDialog = page.getByRole("dialog", { name: "利用時間は3分限定！" });
  if (await introDialog.isVisible()) {
    await introDialog.getByRole("button", { name: "OK" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "フィード", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await page.getByRole("link", { name: "プロフィール" }).click();
  await expect(page.getByRole("heading", { name: "最近の達成" })).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await logOut(page);
});
