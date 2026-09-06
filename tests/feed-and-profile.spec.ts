import {
  expect,
  gotoHome,
  markLoggedIn,
  myPageRoute,
  mockTaskAndFeedApi,
  prepareAppTest,
  test,
} from "./support/appTest";

test.beforeEach(async ({ page }) => prepareAppTest(page));

test("タスク完了後にマイページの達成と集計を再取得して即時表示する", async ({
  page,
}) => {
  let taskCompleted = false;
  let myPageRequests = 0;
  const completedAt = new Date().toISOString();
  const achievement = {
    id: 1,
    can_delete: true,
    task_title: "スライド1枚作る",
    likes_count: 0,
    comments_count: 0,
    created_at: completedAt,
    liked_users: [],
    comments: [],
  };

  await page.unroute(myPageRoute);
  await page.route(myPageRoute, async (route) => {
    myPageRequests += 1;
    const achievements = taskCompleted ? [achievement] : [];

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          level: taskCompleted ? 1 : 0,
          next_level: taskCompleted ? 2 : 1,
          remaining_to_next_level: taskCompleted ? 9 : 10,
          progress_percent: taskCompleted ? 10 : 0,
          achievements_count: taskCompleted ? 1 : 0,
          streak_days: taskCompleted ? 1 : 0,
          likes_count: 0,
          comments_count: 0,
          recent_achievements: achievements,
          all_achievements: achievements,
        },
      }),
    });
  });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?tasks\/\d+\/complete$/, async (route) => {
    taskCompleted = true;
    await route.fallback();
  });
  await gotoHome(page);
  await expect.poll(() => myPageRequests).toBeGreaterThan(0);
  const requestsAfterPrefetch = myPageRequests;

  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("スライド1枚作る");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();

  await expect(page.getByRole("heading", { name: "よくできた" })).toBeVisible();
  await expect.poll(() => myPageRequests).toBe(requestsAfterPrefetch + 1);

  await page.getByRole("button", { name: "次の一歩へ" }).click();
  await page.getByRole("link", { name: "プロフィール" }).click();

  await expect(page.getByRole("heading", { name: "最近の達成" })).toBeVisible();
  await expect(page.getByText("スライド1枚作る")).toBeVisible();
  await expect(page.getByText("1回", { exact: true })).toBeVisible();
  await expect(page.getByText("1日", { exact: true })).toBeVisible();
  await expect(page.getByText("あと9回でLv.2！")).toBeVisible();
  await expect(page.getByText("10%", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "すべて見る>" }).click();
  await expect(
    page.getByRole("heading", { name: "すべての達成" }),
  ).toBeVisible();
  await expect(page.getByText("スライド1枚作る")).toBeVisible();
  expect(myPageRequests).toBe(requestsAfterPrefetch + 1);
});

test("マイページで新しいレベルだけを通知し自動または手動で閉じられる", async ({
  page,
}) => {
  await gotoHome(page);
  await page.getByRole("link", { name: "プロフィール" }).click();
  await expect(page.getByText("Lv.1", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);

  await page.evaluate(() => {
    localStorage.setItem("onestep-last-displayed-level:1", "0");
  });
  await page.reload();

  const notification = page.getByRole("status");
  await expect(notification).toContainText("Lv.1にレベルアップしました！");
  await expect(notification).toContainText("一歩ずつ前に進んでいます！");
  await expect(page.locator(".level-up-sparkles i")).toHaveCount(9);
  await page.getByRole("button", { name: "レベルアップ通知を閉じる" }).click();
  await expect(notification).toHaveCount(0);

  await page.evaluate(() => {
    localStorage.setItem("onestep-last-displayed-level:1", "0");
  });
  await page.reload();
  await expect(notification).toBeVisible();
  await expect(notification).toHaveCount(0, { timeout: 5000 });

  await page.reload();
  await expect(notification).toHaveCount(0);
});

test("フィードのいいねとコメント後にマイページを再取得する", async ({
  page,
}) => {
  let likesCount = 0;
  let commentsCount = 0;
  let myPageRequests = 0;
  const createdAt = new Date().toISOString();

  await page.unroute(myPageRoute);
  await page.route(myPageRoute, async (route) => {
    myPageRequests += 1;
    const achievement = {
      id: 71,
      task_title: "同期を確認するタスク",
      likes_count: likesCount,
      comments_count: commentsCount,
      created_at: createdAt,
      liked_users: [],
      comments: commentsCount
        ? [
            {
              id: 81,
              user_name: "おこめ",
              user_level: 1,
              body: "反映確認コメント",
              created_at: createdAt,
            },
          ]
        : [],
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          level: 1,
          next_level: 2,
          remaining_to_next_level: 9,
          progress_percent: 10,
          achievements_count: 1,
          streak_days: 1,
          likes_count: likesCount,
          comments_count: commentsCount,
          recent_achievements: [achievement],
          all_achievements: [achievement],
        },
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_access_expires_at: new Date(Date.now() + 180_000).toISOString(),
        data: [
          {
            id: 71,
            user_name: "おこめ",
            level: 1,
            task_title: "同期を確認するタスク",
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            is_mine: false,
            can_like: true,
            can_comment: true,
            likes_count: likesCount,
            comments_count: commentsCount,
            liked_by_me: likesCount > 0,
            comments: [],
            created_at: createdAt,
            completed_at: createdAt,
          },
        ],
      }),
    });
  });
  await page.route(/.*\/completion_posts\/71\/likes$/, async (route) => {
    likesCount = route.request().method() === "DELETE" ? 0 : 1;
    await route.fulfill({ status: 204 });
  });
  await page.route(/.*\/completion_posts\/71\/comments$/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: [],
          pagination: { page: 1, has_more: false },
        }),
      });
      return;
    }

    commentsCount = 1;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: 81,
          user_id: 1,
          user_name: "おこめ",
          body: "反映確認コメント",
          post_status_when_commented: "completed",
          created_at: createdAt,
        },
      }),
    });
  });

  await markLoggedIn(page);
  await page.evaluate(() => {
    sessionStorage.setItem("onestep-active-home-view", "feed");
    localStorage.setItem("onestep-feed-intro-seen", "true");
  });
  await page.goto("/home");
  await expect(page.getByText("同期を確認するタスク")).toBeVisible();
  await expect.poll(() => myPageRequests).toBeGreaterThan(0);

  const feedCard = page.locator(".feed-card").filter({
    hasText: "同期を確認するタスク",
  });
  await feedCard.locator(".feed-reaction").click();
  await page.getByRole("link", { name: "プロフィール" }).click();
  let achievementCard = page.locator(".profile-achievement-card").filter({
    hasText: "同期を確認するタスク",
  });
  await expect(
    achievementCard.locator(".achievement-reaction-button").first(),
  ).toContainText("1");

  await page.getByRole("link", { name: "投稿" }).click();
  await feedCard.locator(".feed-reaction").click();
  await page.getByRole("link", { name: "プロフィール" }).click();
  achievementCard = page.locator(".profile-achievement-card").filter({
    hasText: "同期を確認するタスク",
  });
  await expect(
    achievementCard.locator(".achievement-reaction-button").first(),
  ).toContainText("0");

  await page.getByRole("link", { name: "投稿" }).click();
  await feedCard
    .getByRole("button", { name: "おこめさんのコメントを開く" })
    .click();
  await page
    .getByRole("textbox", { name: "おこめさんの投稿にコメントする" })
    .fill("反映確認コメント");
  await page.getByRole("button", { name: "コメントを送信" }).click();
  await page.locator(".feed-comment-panel-close").click();
  await expect(page.locator(".feed-comment-panel")).toBeHidden();
  await page.getByRole("link", { name: "プロフィール" }).click();
  achievementCard = page.locator(".profile-achievement-card").filter({
    hasText: "同期を確認するタスク",
  });
  await expect(
    achievementCard.locator(".achievement-reaction-button").nth(1),
  ).toContainText("1");
});

test("フィードのアイコンから他のユーザーのマイページを表示する", async ({
  page,
}) => {
  const createdAt = new Date().toISOString();
  await page.unroute(myPageRoute);
  await page.route(myPageRoute, async (route) => {
    const isOtherUser =
      new URL(route.request().url()).searchParams.get("user_id") === "2";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          user: isOtherUser
            ? { id: 2, name: "みき", avatar_key: "avatar-2" }
            : { id: 1, name: "おこめ", avatar_key: "avatar-1" },
          level: isOtherUser ? 3 : 1,
          next_level: isOtherUser ? 4 : 2,
          remaining_to_next_level: 4,
          progress_percent: 20,
          achievements_count: 1,
          streak_days: 1,
          likes_count: 2,
          comments_count: 1,
          recent_achievements: [
            {
              id: isOtherUser ? 82 : 81,
              can_delete: !isOtherUser,
              task_title: isOtherUser ? "みきさんの達成" : "自分の達成",
              likes_count: 2,
              comments_count: 1,
              created_at: createdAt,
            },
          ],
          all_achievements: [
            {
              id: isOtherUser ? 82 : 81,
              can_delete: !isOtherUser,
              task_title: isOtherUser ? "みきさんの達成" : "自分の達成",
              likes_count: 2,
              comments_count: 1,
              created_at: createdAt,
            },
          ],
        },
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_access_expires_at: new Date(Date.now() + 180_000).toISOString(),
        data: [
          {
            id: 82,
            user_id: 2,
            user_name: "みき",
            avatar_key: "avatar-2",
            level: 3,
            task_title: "みきさんの達成",
            status_label: "できた",
            card_variant: "completed",
            is_mine: false,
            can_like: true,
            can_comment: true,
            likes_count: 2,
            comments_count: 1,
            liked_by_me: false,
            created_at: createdAt,
          },
          {
            id: 83,
            user_id: 1,
            user_name: "おこめ",
            avatar_key: "avatar-1",
            level: 1,
            task_title: "自分の投稿",
            status_label: "できた",
            card_variant: "completed",
            is_mine: true,
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            created_at: createdAt,
          },
        ],
      }),
    });
  });

  await markLoggedIn(page);
  await page.evaluate(() => {
    sessionStorage.setItem("onestep-active-home-view", "feed");
    localStorage.setItem("onestep-feed-intro-seen", "true");
  });
  await page.goto("/home");
  await expect(
    page.getByRole("button", { name: "あなたさんのマイページを見る" }),
  ).toHaveCount(0);
  await page.getByText("みき", { exact: true }).click();

  await expect(page.getByText("みき", { exact: true })).toBeVisible();
  await expect(page.getByText("みきさんの達成")).toBeVisible();
  await expect(page.getByText("Lv.3", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "設定" })).toHaveCount(0);
  await expect(page.locator(".profile-achievement-menu-button")).toHaveCount(0);

  const backButton = page.getByRole("button", { name: "フィードに戻る" });
  await expect(backButton).toHaveCSS("width", "40px");
  await expect(backButton).toHaveCSS("height", "40px");
  await expect(backButton).toHaveCSS("border-radius", "50%");
  await expect(backButton.locator("svg")).toHaveCount(1);
  await backButton.click();
  await expect(page.getByRole("heading", { name: "フィード" })).toBeVisible();
  await expect(page.getByText("みきさんの達成")).toBeVisible();
});

test("フィード閲覧時間外は案内画面からホームへ戻れる", async ({ page }) => {
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: false,
        remaining_seconds: 0,
        data: [],
      }),
    });
  });
  await gotoHome(page);

  await page.getByRole("link", { name: "投稿" }).click();

  await expect(
    page.getByRole("heading", { name: "フィード", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "フィードは3分だけ見られます" }),
  ).toBeVisible();
  await expect(page.getByText("フィードってなに？")).toBeVisible();
  await expect(page.getByText("1. やります")).toBeVisible();
  await expect(page.getByText("2. できた！")).toBeVisible();
  await expect(page.getByText("3. フィード解放")).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "3分経過しました" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "最初の一歩を始める" }).click();

  await expect(page.getByRole("heading", { name: "フィード" })).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();
});

test("マイページから自分の投稿を削除して実績を再取得する", async ({ page }) => {
  let deleted = false;
  let deleteRequests = 0;

  await page.unroute(myPageRoute);
  await page.route(myPageRoute, async (route) => {
    const achievements = deleted
      ? []
      : [
          {
            id: 42,
            can_delete: true,
            task_title: "削除対象の投稿",
            likes_count: 2,
            comments_count: 1,
            created_at: new Date().toISOString(),
            liked_users: [],
            comments: [],
          },
        ];

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          level: deleted ? 0 : 1,
          next_level: deleted ? 1 : 2,
          remaining_to_next_level: deleted ? 10 : 9,
          progress_percent: deleted ? 0 : 10,
          achievements_count: achievements.length,
          streak_days: achievements.length,
          likes_count: deleted ? 0 : 2,
          comments_count: deleted ? 0 : 1,
          recent_achievements: achievements,
          all_achievements: achievements,
        },
      }),
    });
  });

  await page.route(/.*\/(?:api\/)?completion_posts\/42$/, async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.fallback();
      return;
    }

    deleteRequests += 1;
    deleted = true;
    await route.fulfill({ status: 204 });
  });

  await gotoHome(page);
  await page.getByRole("link", { name: "プロフィール" }).click();
  await expect(page.getByText("削除対象の投稿")).toBeVisible();

  await page.getByRole("button", { name: "削除対象の投稿のメニュー" }).click();
  await page.getByRole("menuitem", { name: "投稿を削除" }).click();

  const dialog = page.getByRole("dialog", { name: "投稿を削除しますか？" });
  await expect(dialog).toContainText(
    "削除した投稿は元に戻せません。この投稿に関する達成回数・いいね・コメントも実績から削除されます。",
  );
  await dialog.getByRole("button", { name: "削除する" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("削除対象の投稿")).toHaveCount(0);
  await expect(page.getByText("まだ記録はありません")).toBeVisible();
  expect(deleteRequests).toBe(1);
});

test("フィード閲覧時間が終了するとモーダルからホームへ戻れる", async ({
  page,
}) => {
  await mockTaskAndFeedApi(page);
  await page.clock.install();
  await gotoHome(page);
  await page.evaluate(() => {
    localStorage.setItem("onestep-feed-intro-seen", "true");
  });

  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("スライド1枚作る");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();
  await page.getByRole("link", { name: "みんなを見る" }).click();

  await expect(page.getByRole("heading", { name: "フィード" })).toBeVisible();
  await page.clock.fastForward(3 * 60 * 1000);

  const expiredDialog = page.getByRole("dialog", {
    name: "3分経過しました",
  });
  const expiredBackdrop = expiredDialog.locator("..");
  await expect(expiredBackdrop).toHaveCSS("position", "fixed");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(expiredDialog).toBeVisible();
  await expect(
    expiredDialog.getByText("リフレッシュできましたか？"),
  ).toBeVisible();

  await expiredDialog.getByRole("button", { name: "始める" }).click();

  await expect(page.getByRole("heading", { name: "フィード" })).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();
});
