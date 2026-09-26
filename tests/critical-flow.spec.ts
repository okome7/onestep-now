import { expect, type BrowserContext, type Page, test } from "@playwright/test";

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

const completeTaskAndOpenFeed = async (page: Page, taskTitle: string) => {
  await page.getByRole("textbox", { name: "今できること" }).fill(taskTitle);
  await page.getByRole("button", { name: "始める" }).click();
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
  await page.getByRole("button", { name: "できた！" }).click();
  await expect(page.getByRole("heading", { name: "よくできた" })).toBeVisible();
  await page.getByRole("link", { name: "みんなを見る" }).click();
};

const fetchSession = async (page: Page) =>
  page.evaluate(async () => {
    const response = await fetch("/api/session", { credentials: "include" });
    return response.json() as Promise<{
      status: string;
      data: { feed_intro_seen_at: string | null } | null;
    }>;
  });

const deleteAccountIfAuthenticated = async (page: Page) => {
  if (page.isClosed()) {
    return false;
  }

  return page.evaluate(async () => {
    const csrfCookie = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith("onestep_csrf="));

    if (!csrfCookie) {
      return false;
    }

    const csrfToken = decodeURIComponent(csrfCookie.split("=")[1] ?? "");
    const response = await fetch("/api/account", {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken },
    });
    return response.ok;
  });
};

const closeContext = async (context: BrowserContext | undefined) => {
  if (context) {
    await context.close();
  }
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
  await page.getByRole("textbox", { name: "今できること" }).fill(taskTitle);
  await page.getByRole("button", { name: "始める" }).click();
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
  await page.getByRole("button", { name: "できた！" }).click();
  await expect(page.getByRole("heading", { name: "よくできた" })).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await page.getByRole("link", { name: "みんなを見る" }).click();
  const introDialog = page.getByRole("dialog", { name: "利用時間は3分限定！" });
  await expect(introDialog).toBeVisible();
  await introDialog.getByRole("button", { name: "OK" }).click();
  await expect(
    page.getByRole("heading", { name: "フィード", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await page.getByRole("link", { name: "プロフィール" }).click();
  await expect(page.getByRole("heading", { name: "最近の達成" })).toBeVisible();
  await expect(page.getByText(taskTitle)).toBeVisible();

  await logOut(page);
});

test("初回説明の確認状態を別ブラウザと再ログイン後も引き継ぐ", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);

  const baseURL = testInfo.project.use.baseURL as string;
  const suffix = `${testInfo.project.name}-${Date.now()}`.replace(
    /[^a-z0-9-]/gi,
    "-",
  );
  const account = {
    email: `fa-07-${suffix}@example.com`,
    password: "password1",
  };
  const taskTitle = `FA-07 ${suffix}`;
  let context1: BrowserContext | undefined;
  let context2: BrowserContext | undefined;
  let page1: Page | undefined;
  let page2: Page | undefined;

  try {
    context1 = await browser.newContext({ baseURL });
    page1 = await context1.newPage();
    await registerAccount(page1, account);
    await completeTaskAndOpenFeed(page1, taskTitle);

    const introDialog1 = page1.getByRole("dialog", {
      name: "利用時間は3分限定！",
    });
    await expect(introDialog1).toBeVisible();
    await introDialog1.getByRole("button", { name: "OK" }).click();
    await expect(introDialog1).toHaveCount(0);
    await expect(
      page1.getByRole("heading", { name: "フィード", exact: true }),
    ).toBeVisible();
    await expect(page1.locator(".feed-countdown")).toBeVisible();

    const context1Session = await fetchSession(page1);
    expect(context1Session.data?.feed_intro_seen_at).not.toBeNull();
    const context1Storage = await page1.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }));
    expect(Object.keys(context1Storage.local).length).toBeGreaterThan(0);
    expect(Object.keys(context1Storage.session).length).toBeGreaterThan(0);
    expect(
      (await context1.cookies()).some(
        (cookie) => cookie.name === "onestep_session",
      ),
    ).toBe(true);

    context2 = await browser.newContext({ baseURL });
    expect(
      (await context2.cookies()).some(
        (cookie) => cookie.name === "onestep_session",
      ),
    ).toBe(false);
    page2 = await context2.newPage();
    await page2.goto("/");
    const context2Storage = await page2.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }));
    expect(context2Storage.local).toEqual({});
    expect(context2Storage.session).toEqual({});

    await page2.getByRole("link", { name: "ログイン" }).click();
    const firstLoginResponsePromise = page2.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/login"),
    );
    await logIn(page2, account);
    const firstLoginBody = (await firstLoginResponsePromise).json() as Promise<{
      data: { feed_intro_seen_at: string | null };
    }>;
    expect((await firstLoginBody).data.feed_intro_seen_at).not.toBeNull();
    expect(
      (await context2.cookies()).some(
        (cookie) => cookie.name === "onestep_session",
      ),
    ).toBe(true);

    await page2.getByRole("link", { name: "投稿" }).click();
    await expect(
      page2.getByRole("heading", { name: "フィード", exact: true }),
    ).toBeVisible();
    await expect(page2.locator(".feed-countdown")).toBeVisible();
    await expect(
      page2.getByRole("dialog", { name: "利用時間は3分限定！" }),
    ).toHaveCount(0);

    const authCookieBeforeClear = (await context2.cookies()).find(
      (cookie) => cookie.name === "onestep_session",
    );
    await page2.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const sessionResponsePromise = page2.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname.endsWith("/session"),
    );
    await page2.reload();
    const restoredSessionBody = (await sessionResponsePromise).json() as Promise<{
      data: { feed_intro_seen_at: string | null };
    }>;
    expect((await restoredSessionBody).data.feed_intro_seen_at).not.toBeNull();
    const authCookieAfterClear = (await context2.cookies()).find(
      (cookie) => cookie.name === "onestep_session",
    );
    expect(authCookieAfterClear?.value).toBe(authCookieBeforeClear?.value);
    await expect(page2).toHaveURL(/\/home$/);
    await page2.getByRole("link", { name: "投稿" }).click();
    await expect(
      page2.getByRole("heading", { name: "フィード", exact: true }),
    ).toBeVisible();
    await expect(page2.locator(".feed-countdown")).toBeVisible();
    await expect(
      page2.getByRole("dialog", { name: "利用時間は3分限定！" }),
    ).toHaveCount(0);

    await page2.getByRole("link", { name: "プロフィール" }).click();
    await logOut(page2);
    const secondLoginResponsePromise = page2.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/login"),
    );
    await logIn(page2, account);
    const secondLoginBody = (await secondLoginResponsePromise).json() as Promise<{
      data: { feed_intro_seen_at: string | null };
    }>;
    expect((await secondLoginBody).data.feed_intro_seen_at).not.toBeNull();
    expect((await fetchSession(page2)).data?.feed_intro_seen_at).not.toBeNull();
    await page2.getByRole("link", { name: "投稿" }).click();
    await expect(
      page2.getByRole("heading", { name: "フィード", exact: true }),
    ).toBeVisible();
    await expect(page2.locator(".feed-countdown")).toBeVisible();
    await expect(
      page2.getByRole("dialog", { name: "利用時間は3分限定！" }),
    ).toHaveCount(0);
  } finally {
    if (page2) {
      await deleteAccountIfAuthenticated(page2).catch(() => false);
    }
    if (page1) {
      await deleteAccountIfAuthenticated(page1).catch(() => false);
    }
    await closeContext(context2);
    await closeContext(context1);
  }
});
