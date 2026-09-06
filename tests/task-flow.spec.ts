import {
  activeTaskRoute,
  expect,
  gotoHome,
  markLoggedIn,
  mockSession,
  mockTaskAndFeedApi,
  prepareAppTest,
  test,
} from "./support/appTest";

test.beforeEach(async ({ page }) => prepareAppTest(page));

test("ホーム画面が表示される", async ({ page }) => {
  await gotoHome(page);

  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /interactive-widget=overlays-content/,
  );

  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "今できることから" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "始める" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "ホームメニュー" }),
  ).toBeVisible();
});

test("スマホの主要コンテンツに左右の余白を表示する", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await mockTaskAndFeedApi(page);
  await gotoHome(page);

  const homeStart = page.locator(".home-start");
  await expect(homeStart).toHaveCSS("padding-left", "24px");
  await expect(homeStart).toHaveCSS("padding-right", "24px");
  const taskInput = page.getByRole("textbox", { name: "今できること" });
  const taskInputBox = await taskInput.boundingBox();
  expect(taskInputBox).not.toBeNull();

  await page.getByRole("link", { name: "投稿" }).click();
  const feedList = page.locator(".feed-list");
  await expect(feedList).toBeVisible();
  await expect
    .poll(async () => {
      const box = await feedList.boundingBox();
      return box?.width;
    })
    .toBeCloseTo(taskInputBox?.width ?? 0, 0);

  await page.evaluate(() => {
    sessionStorage.setItem("onestep-active-home-view", "profile");
  });
  await page.reload();
  const profileContent = page.locator(".profile-content");
  await expect(profileContent).toBeVisible();
  await expect
    .poll(async () => {
      const box = await profileContent.boundingBox();
      return box?.width;
    })
    .toBeCloseTo(taskInputBox?.width ?? 0, 0);

  await mockSession(page, false);
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  await page.goto("/login");
  const loginEmailBox = await page.getByLabel("メールアドレス").boundingBox();
  expect(loginEmailBox?.width).toBeCloseTo(taskInputBox?.width ?? 0, 0);

  await page.getByRole("link", { name: "新規登録" }).click();
  const signupNameBox = await page.getByLabel("表示名").boundingBox();
  expect(signupNameBox?.width).toBeCloseTo(taskInputBox?.width ?? 0, 0);
});

test("ホーム画面は末尾スラッシュ付きでも表示される", async ({ page }) => {
  await gotoHome(page, "/home/");

  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();
});

test("入力途中のタスクはリロード後も保持される", async ({ page }) => {
  await gotoHome(page);

  const taskInput = page.getByRole("textbox", { name: "今できること" });
  await taskInput.fill("あとで始めるタスク");
  await page.reload();

  await expect(taskInput).toHaveValue("あとで始めるタスク");
});

test("ホーム画面でやることを入力せずに始めるとエラーが表示される", async ({
  page,
}) => {
  await gotoHome(page);

  await page.getByRole("button", { name: "始める" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "やることを入力してください",
  );
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toHaveAttribute("aria-invalid", "true");
});

test("ホーム画面でやることを始めるとタイマーが表示される", async ({ page }) => {
  await mockTaskAndFeedApi(page);
  await gotoHome(page);

  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("スライド1枚作る");
  await page.getByRole("button", { name: "始める" }).click();

  await expect
    .poll(() =>
      page.evaluate(() => sessionStorage.getItem("onestep-task-draft")),
    )
    .toBeNull();

  await expect(
    page.getByRole("heading", { name: "スライド1枚作る" }),
  ).toBeVisible();
  await expect(page.getByText("00:00")).toBeVisible();
  await expect(page.getByRole("button", { name: "できた！" })).toBeVisible();
  await expect(page.getByRole("button", { name: "やめる" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "ホームメニュー" }),
  ).toHaveCount(0);
});

test("集中画面でやめるを押すと確認モーダルが表示され、確定するとホーム画面に戻る", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await mockTaskAndFeedApi(page);
  await gotoHome(page);

  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("スライド1枚作る");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "やめる" }).click();

  const dialog = page.getByRole("dialog", {
    name: "このタスクをやめますか？",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("投稿は削除されます")).toBeVisible();
  const cancelButton = dialog.getByRole("button", { name: "キャンセル" });
  await expect(cancelButton).toHaveCSS("white-space", "nowrap");

  await dialog.getByRole("button", { name: "やめる" }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "今できること" })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("heading", { name: "スライド1枚作る" }),
  ).toHaveCount(0);
});

test("集中画面でできたを押すと完了画面が表示される", async ({ page }) => {
  await mockTaskAndFeedApi(page);
  await gotoHome(page);

  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("スライド1枚作る");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();

  await expect(page.getByRole("heading", { name: "よくできた" })).toBeVisible();
  await expect(page.getByText("スライド1枚作る")).toBeVisible();
  await expect(page.getByText("12件")).toBeVisible();
  await expect(page.getByText("9件")).toBeVisible();
  const commentsRegion = page.getByRole("region", { name: "コメント" });
  await expect(commentsRegion).toBeVisible();
  await expect
    .poll(async () =>
      commentsRegion.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    )
    .toBe(true);
  await expect(page.getByText("頑張れ！")).toBeVisible();
  await expect(
    page.getByText(
      "今日も一歩進めていてすごい！その調子で次の一歩も応援してるよ",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "みんなを見る" })).toBeVisible();
  await expect(page.getByRole("button", { name: "次の一歩へ" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () => document.documentElement.scrollHeight <= window.innerHeight,
      ),
    )
    .toBe(true);
});

test("ブラウザを再起動しても進行中タスクと経過時間を復元する", async ({
  page,
}) => {
  const startedAt = new Date(Date.now() - 65 * 1000).toISOString();
  await markLoggedIn(page);
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 3 * 60,
        feed_access_expires_at: new Date(
          Date.now() + 3 * 60 * 1000,
        ).toISOString(),
        data: [],
      }),
    });
  });
  await page.unroute(activeTaskRoute);
  await page.route(activeTaskRoute, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: 42,
          title: "再起動後も続けるタスク",
          status: "active",
          started_at: startedAt,
          completion_post_id: 52,
        },
      }),
    });
  });
  await page.evaluate(() => {
    sessionStorage.setItem("onestep-active-home-view", "feed");
  });

  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "再起動後も続けるタスク" }),
  ).toBeVisible();
  await expect(page.locator(".focus-timer")).toHaveText(/01:(0[5-9]|1\d)/);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "再起動後も続けるタスク" }),
  ).toBeVisible();
  await expect(page.locator(".focus-timer")).toHaveText(/01:(0[5-9]|1\d)/);
});
