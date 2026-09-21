import {
  expect,
  gotoHome,
  markLoggedIn,
  mockLogin,
  myPageRoute,
  mockTaskAndFeedApi,
  prepareAppTest,
  test,
} from "./support/appTest";

test.beforeEach(async ({ page }) => prepareAppTest(page));

test("名前とアイコンの変更をリロードせずプロフィールとフィードへ反映する", async ({
  page,
}) => {
  let currentName = "おこめ";
  let currentAvatarKey = "avatar-1";

  await page.unroute(myPageRoute);
  await page.route(myPageRoute, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          user: {
            id: 1,
            name: "おこめ",
            avatar_key: "avatar-1",
          },
          level: 1,
          next_level: 2,
          remaining_to_next_level: 10,
          progress_percent: 0,
          achievements_count: 0,
          streak_days: 0,
          likes_count: 0,
          comments_count: 0,
          recent_achievements: [],
          all_achievements: [],
        },
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?profile$/, async (route) => {
    const body = route.request().postDataJSON() as {
      user?: { name?: string; avatar_key?: string };
    };
    currentName = body.user?.name ?? currentName;
    currentAvatarKey = body.user?.avatar_key ?? currentAvatarKey;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: 1,
          name: currentName,
          email: "okome@example.com",
          avatar_key: currentAvatarKey,
        },
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: true,
        remaining_seconds: 180,
        data: [
          {
            id: 1,
            user_id: 1,
            user_name: "おこめ",
            avatar_key: "avatar-1",
            level: 1,
            task_title: "自分の投稿",
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            is_mine: true,
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            comments: [],
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });

  await gotoHome(page);
  await page.getByRole("link", { name: "投稿" }).click();
  const initialFeedAvatarSrc = await page
    .locator(".feed-avatar")
    .getAttribute("src");
  await page.getByRole("link", { name: "プロフィール" }).click();
  const initialAvatarSrc = await page
    .locator(".profile-avatar-large")
    .getAttribute("src");
  await page.getByRole("button", { name: "設定" }).click();
  await page.getByRole("button", { name: "表示名変更" }).click();
  await page.getByRole("textbox", { name: "表示名" }).fill("変更後の名前");
  await page.getByRole("button", { name: "完了" }).click();
  await page.getByRole("button", { name: "マイページに戻る" }).click();

  await expect(page.getByText("変更後の名前", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "設定" }).click();
  await page.getByRole("button", { name: "アイコン変更" }).click();
  await page.getByRole("button", { name: "アイコンを選択" }).click();
  await page.getByRole("radio", { name: "アイコン2" }).click();
  await page.getByRole("button", { name: "閉じる" }).click();
  await page.getByRole("button", { name: "完了" }).click();
  await page.getByRole("button", { name: "マイページに戻る" }).click();

  await expect(page.locator(".profile-avatar-large")).not.toHaveAttribute(
    "src",
    initialAvatarSrc ?? "",
  );

  await page.getByRole("link", { name: "投稿" }).click();
  await expect(page.locator(".feed-avatar")).not.toHaveAttribute(
    "src",
    initialFeedAvatarSrc ?? "",
  );
  await expect(page.getByText("あなた", { exact: true })).toBeVisible();
});

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
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ status: "error", errors: ["Forbidden"] }),
    });
  });
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
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_access_expires_at: new Date(
          Date.now() + 180_000,
        ).toISOString(),
        data: [
          {
            id: 92,
            user_name: "みき",
            level: 2,
            task_title: "期限切れ前にコメントする投稿",
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            is_mine: false,
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            comments: [],
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });
  await page.route(
    /.*\/(?:api\/)?completion_posts\/92\/comments(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          pagination: { page: 1, per_page: 20, has_more: false },
          data: [],
        }),
      });
    },
  );
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
  await page
    .getByRole("button", { name: "みきさんのコメントを開く" })
    .click();
  const commentPanel = page.locator(".feed-comment-panel");
  const commentInput = page.getByRole("textbox", {
    name: "みきさんの投稿にコメントする",
  });
  const commentSubmit = page.getByRole("button", { name: "コメントを送信" });
  await commentInput.fill("期限切れ後は送信できない");
  await commentInput.focus();
  await expect(commentInput).toBeFocused();

  await page.clock.fastForward(3 * 60 * 1000);

  const expiredDialog = page.getByRole("dialog", {
    name: "3分経過しました",
  });
  const expiredBackdrop = expiredDialog.locator("..");
  await expect(expiredBackdrop).toHaveCSS("position", "fixed");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(expiredDialog).toBeVisible();
  await expect(page.getByLabel("残り 00:00")).toBeVisible();
  await expect(page.locator(".feed-list")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(commentPanel).toHaveCount(0);
  await expect(commentInput).toHaveCount(0);
  await expect(commentSubmit).toHaveCount(0);
  await expect(
    expiredDialog.getByText("リフレッシュできましたか？"),
  ).toBeVisible();

  await expiredDialog.getByRole("button", { name: "始める" }).click();

  await expect(page.getByRole("heading", { name: "フィード" })).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();
});

test("初回説明のOK後にカウントダウンとフィード閲覧を開始する", async ({
  page,
}) => {
  let initialFeedRequests = 0;
  let loadMoreFeedRequests = 0;
  let accessRequests = 0;
  let cableTokenRequests = 0;

  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed(?:\?[^#]*)?$/, async (route) => {
    const pageNumber = new URL(route.request().url()).searchParams.get("page");
    if (pageNumber && pageNumber !== "1") {
      loadMoreFeedRequests += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          access_allowed: true,
          feed_access_pending: false,
          remaining_seconds: 180,
          feed_access_expires_at: new Date(
            Date.now() + 180_000,
          ).toISOString(),
          pagination: { page: Number(pageNumber), per_page: 20, has_more: false },
          data: [],
        }),
      });
      return;
    }

    initialFeedRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: false,
        feed_access_pending: true,
        remaining_seconds: 0,
        pagination: { page: 1, per_page: 20, has_more: true },
        data: [
          {
            id: 91,
            user_name: "みき",
            level: 2,
            task_title: "初回説明後に見える投稿",
            status_label: "できた",
            card_variant: "completed",
            is_mine: false,
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;

    if (accessRequests === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          errors: ["フィードを開始できませんでした"],
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_access_expires_at: new Date(Date.now() + 180_000).toISOString(),
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?cable_token$/, async (route) => {
    cableTokenRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", token: "feed-intro-token" }),
    });
  });

  await page.clock.install();
  await gotoHome(page, "/home", { feed_intro_seen_at: null });
  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("初回説明を確認する");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();
  await expect.poll(() => initialFeedRequests).toBe(1);
  await expect(page.locator(".feed-card")).toHaveCount(0);
  expect(accessRequests).toBe(0);
  expect(cableTokenRequests).toBe(0);
  await expect(page.locator(".feed-countdown")).toHaveCount(0);
  await page.getByRole("link", { name: "みんなを見る" }).click();

  const introDialog = page.getByRole("dialog", {
    name: "利用時間は3分限定！",
  });
  await expect(page.getByText("読み込んでいます…")).toHaveCount(0);
  await expect(introDialog).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "フィードは3分だけ見られます" }),
  ).toHaveCount(0);
  await expect(page.locator(".feed-countdown")).toHaveCount(0);
  await expect.poll(() => initialFeedRequests).toBe(1);
  expect(loadMoreFeedRequests).toBe(0);
  expect(accessRequests).toBe(0);
  expect(cableTokenRequests).toBe(0);
  const feedList = page.locator(".feed-list");
  const backgroundPost = page.getByText("初回説明後に見える投稿");
  await expect(backgroundPost).toBeAttached();
  await expect(feedList).toHaveAttribute("aria-hidden", "true");
  await expect(feedList).toHaveAttribute("inert", "");
  await expect(feedList).toHaveCSS("filter", "blur(5px)");
  await expect(page.locator(".feed-intro-backdrop")).toBeVisible();
  await expect(page.locator(".feed-countdown")).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(
    page.locator(".feed-reaction").first().click({ trial: true, timeout: 500 }),
  ).rejects.toThrow();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest(".feed-list")),
    ),
  ).toBe(false);

  const scrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 1000);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  expect(initialFeedRequests).toBe(1);
  expect(loadMoreFeedRequests).toBe(0);

  await page.setViewportSize({ width: 375, height: 667 });
  const modalBox = await introDialog.boundingBox();
  expect(modalBox).not.toBeNull();
  expect(modalBox!.x).toBeGreaterThanOrEqual(0);
  expect(modalBox!.y).toBeGreaterThanOrEqual(0);
  expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(375);
  expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(667);

  await page.clock.fastForward(60_000);
  await expect(page.locator(".feed-countdown")).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "3分経過しました" }),
  ).toHaveCount(0);

  await introDialog.getByRole("button", { name: "OK" }).click();

  expect(accessRequests).toBe(1);
  expect(initialFeedRequests).toBe(1);
  expect(loadMoreFeedRequests).toBe(0);
  expect(cableTokenRequests).toBe(0);
  await expect(introDialog).toBeVisible();
  await expect(introDialog.getByRole("button", { name: "OK" })).toBeEnabled();
  await expect(page.getByLabel("残り 00:00")).toHaveCount(0);
  await expect(backgroundPost).toBeAttached();
  await expect(feedList).toHaveAttribute("aria-hidden", "true");
  await expect(feedList).toHaveCSS("filter", "blur(5px)");

  await introDialog.getByRole("button", { name: "OK" }).click();

  expect(accessRequests).toBe(2);
  expect(initialFeedRequests).toBe(1);
  await expect.poll(() => cableTokenRequests).toBe(1);
  await expect(
    page.getByLabel(/残り (?:03:00|02:5[89])/),
  ).toBeVisible();
  await expect(backgroundPost).toBeVisible();
  await expect(feedList).not.toHaveAttribute("aria-hidden", "true");
  await expect(feedList).not.toHaveAttribute("inert", "");
  await expect(feedList).toHaveCSS("filter", "none");
  await page.locator(".feed-reaction").first().click();
});

test("初回説明のOKを連打しても閲覧開始処理を一度だけ実行する", async ({
  page,
}) => {
  let accessRequests = 0;
  let releaseAccessResponse = () => {};
  const accessResponseGate = new Promise<void>((resolve) => {
    releaseAccessResponse = resolve;
  });

  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: false,
        feed_access_pending: true,
        remaining_seconds: 0,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    await accessResponseGate;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_access_expires_at: new Date(Date.now() + 180_000).toISOString(),
      }),
    });
  });

  await page.clock.install();
  await gotoHome(page, "/home", { feed_intro_seen_at: null });
  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("OKの連打を確認する");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();
  await page.getByRole("link", { name: "みんなを見る" }).click();

  const okButton = page
    .getByRole("dialog", { name: "利用時間は3分限定！" })
    .getByRole("button", { name: "OK" });
  await okButton.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
    button.click();
  });

  await expect.poll(() => accessRequests).toBe(1);
  await expect(okButton).toBeDisabled();

  releaseAccessResponse();

  await expect(page.getByLabel("残り 03:00")).toBeVisible();
  expect(accessRequests).toBe(1);
});

test("確認済みユーザーはフィードを開いた時点から閲覧を開始する", async ({
  page,
}) => {
  const fixedTime = new Date("2026-09-20T03:00:00.000Z");
  let releaseStart!: () => void;
  const startGate = new Promise<void>((resolve) => {
    releaseStart = resolve;
  });
  let accessRequests = 0;
  let feedRequests = 0;
  let cableTokenRequests = 0;
  let accessStarted = false;
  let expiresAt = "";

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    await startGate;
    accessStarted = true;
    expiresAt = new Date(Date.now() + 180_000).toISOString();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
        feed_access_expires_at: expiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed(?:\?.*)?$/, async (route) => {
    feedRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: accessStarted,
        feed_access_pending: !accessStarted,
        remaining_seconds: accessStarted ? 180 : 0,
        feed_access_expires_at: accessStarted ? expiresAt : null,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [
          {
            id: 108,
            user_name: "確認済みユーザー",
            task_title: "開いた時点から開始する",
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            comments: [],
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?cable_token$/, async (route) => {
    cableTokenRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", token: "fa-08-token" }),
    });
  });

  await gotoHome(page, "/home", {
    feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
  });
  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("開いた時点から開始する");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();

  await expect.poll(() => feedRequests).toBe(1);
  await page.clock.runFor(60_000);
  expect(accessRequests).toBe(0);
  expect(feedRequests).toBe(1);
  expect(cableTokenRequests).toBe(0);
  await expect(page.locator(".feed-card")).toHaveCount(0);
  await expect(page.locator(".feed-countdown")).toHaveCount(0);

  await page.getByRole("link", { name: "みんなを見る" }).click();
  await expect.poll(() => accessRequests).toBe(1);
  await expect(page.getByText("読み込んでいます…")).toHaveCount(0);
  await expect(page.getByText("開いた時点から開始する")).toBeVisible();
  await expect(page.locator(".feed-countdown")).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "利用時間は3分限定！" }),
  ).toHaveCount(0);
  expect(feedRequests).toBe(1);
  expect(cableTokenRequests).toBe(0);
  const feedList = page.locator(".feed-list");
  await expect(feedList).toHaveAttribute("aria-hidden", "true");
  await expect(feedList).toHaveAttribute("inert", "");
  await expect(
    page.locator(".feed-reaction").first().click({ trial: true, timeout: 500 }),
  ).rejects.toThrow();

  await page.getByRole("link", { name: "投稿" }).click();
  await page.getByRole("link", { name: "投稿" }).click();
  expect(accessRequests).toBe(1);

  releaseStart();
  await expect(page.getByText("開いた時点から開始する")).toBeVisible();
  await expect(page.getByLabel(/残り (?:03:00|02:59)/)).toBeVisible();
  await expect.poll(() => cableTokenRequests).toBe(1);
  expect(accessRequests).toBe(1);
  expect(feedRequests).toBe(1);
  await expect(feedList).not.toHaveAttribute("aria-hidden", "true");
  await expect(feedList).not.toHaveAttribute("inert", "");
});

test("確認済みユーザーは先読み投稿を保持したまま開始失敗を再試行できる", async ({
  page,
}) => {
  const fixedTime = new Date("2026-09-20T03:00:00.000Z");
  let accessRequests = 0;
  let feedRequests = 0;
  let cableTokenRequests = 0;
  let expiresAt = "";
  let remainingSeconds = 180;

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    if (accessRequests === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", errors: ["開始失敗"] }),
      });
      return;
    }

    expiresAt ||= new Date(fixedTime.getTime() + 180_000).toISOString();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: remainingSeconds,
        feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
        feed_access_expires_at: expiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed(?:\?.*)?$/, async (route) => {
    feedRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: true,
        feed_access_pending: false,
        remaining_seconds: remainingSeconds,
        feed_access_expires_at: expiresAt,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [
          {
            id: 109,
            user_name: "確認済みユーザー",
            task_title: "失敗後に再試行する",
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            comments: [],
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?cable_token$/, async (route) => {
    cableTokenRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", token: "fa-08-retry-token" }),
    });
  });

  await gotoHome(page, "/home", {
    feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
  });
  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("失敗後に再試行する");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();
  await expect.poll(() => feedRequests).toBe(1);
  await page.getByRole("link", { name: "みんなを見る" }).click();

  await expect(page.getByRole("alert")).toContainText("開始失敗");
  await expect(page.getByText("失敗後に再試行する")).toBeVisible();
  await expect(page.getByText("読み込んでいます…")).toHaveCount(0);
  await expect(page.locator(".feed-list")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(accessRequests).toBe(1);
  expect(feedRequests).toBe(1);
  expect(cableTokenRequests).toBe(0);
  await expect(page.locator(".feed-countdown")).toHaveCount(0);

  await page.getByRole("button", { name: "再読み込み" }).click();
  await expect(page.getByLabel(/残り (?:03:00|02:59)/)).toBeVisible();
  await expect.poll(() => cableTokenRequests).toBe(1);
  expect(accessRequests).toBe(2);
  expect(feedRequests).toBe(1);
});

test("先読み失敗後は開始APIを一度だけ実行して投稿取得だけを再試行する", async ({
  page,
}) => {
  const fixedTime = new Date("2026-09-20T03:00:00.000Z");
  const expiresAt = new Date(fixedTime.getTime() + 180_000).toISOString();
  let accessRequests = 0;
  let feedRequests = 0;
  let cableTokenRequests = 0;

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
        feed_access_expires_at: expiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed(?:\?.*)?$/, async (route) => {
    feedRequests += 1;
    if (feedRequests <= 2) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", errors: ["取得失敗"] }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: true,
        feed_access_pending: false,
        remaining_seconds: 120,
        feed_access_expires_at: expiresAt,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?cable_token$/, async (route) => {
    cableTokenRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", token: "prefetch-retry-token" }),
    });
  });

  await gotoHome(page, "/home", {
    feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
  });
  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("先読み失敗後に再試行する");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();
  await expect.poll(() => feedRequests).toBe(1);
  expect(accessRequests).toBe(0);

  await page.getByRole("link", { name: "みんなを見る" }).click();
  await expect(page.getByRole("alert")).toContainText("取得失敗");
  expect(accessRequests).toBe(1);
  expect(feedRequests).toBe(2);
  expect(cableTokenRequests).toBe(0);

  await page.clock.runFor(60_000);
  await page.getByRole("button", { name: "再読み込み" }).click();

  await expect(page.getByLabel("残り 02:00")).toBeVisible();
  await expect.poll(() => cableTokenRequests).toBe(1);
  expect(accessRequests).toBe(1);
  expect(feedRequests).toBe(3);
});

test("初回説明の先読み失敗後もフィードを開くと背景とモーダルを表示する", async ({
  page,
}) => {
  let feedRequests = 0;
  let cableTokenRequests = 0;

  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    feedRequests += 1;
    if (feedRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          errors: ["フィード取得に失敗しました"],
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: false,
        feed_access_pending: true,
        remaining_seconds: 0,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [
          {
            id: 92,
            user_name: "ゆき",
            level: 1,
            task_title: "再試行後に見える投稿",
            status_label: "できた",
            card_variant: "completed",
            is_mine: false,
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        feed_intro_seen_at: new Date().toISOString(),
        remaining_seconds: 180,
        feed_access_expires_at: new Date(Date.now() + 180_000).toISOString(),
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?cable_token$/, async (route) => {
    cableTokenRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { token: "feed-intro-retry-token" },
      }),
    });
  });

  await page.clock.install();
  await gotoHome(page, "/home", { feed_intro_seen_at: null });
  await page
    .getByRole("textbox", { name: "今できること" })
    .fill("背景取得を再試行する");
  await page.getByRole("button", { name: "始める" }).click();
  await page.getByRole("button", { name: "できた！" }).click();
  await expect.poll(() => feedRequests).toBe(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("link", { name: "みんなを見る" }).click();

  const introDialog = page.getByRole("dialog", {
    name: "利用時間は3分限定！",
  });
  await expect(page.getByText("再試行後に見える投稿")).toBeAttached();
  await expect(introDialog).toBeVisible();
  await expect(page.locator(".feed-list")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator(".feed-countdown")).toHaveCount(0);
  expect(feedRequests).toBe(2);
  expect(cableTokenRequests).toBe(0);

  await introDialog.getByRole("button", { name: "OK" }).click();

  await expect(page.getByLabel(/残り (?:03:00|02:5[89])/)).toBeVisible();
  await expect.poll(() => cableTokenRequests).toBe(1);
});

test("同じブラウザでもアカウントごとの初回説明確認状態に従う", async ({
  page,
}) => {
  const accounts = {
    A: {
      id: 1,
      name: "未確認A",
      email: "account-a@example.com",
      avatar_key: "avatar-1",
      feed_intro_seen_at: null as string | null,
    },
    B: {
      id: 2,
      name: "確認済みB",
      email: "account-b@example.com",
      avatar_key: "avatar-2",
      feed_intro_seen_at: "2026-09-18T03:00:00.000Z" as string | null,
    },
  };
  let currentAccount: keyof typeof accounts = "B";
  let failNextStart = false;
  const taskTitles: Record<keyof typeof accounts, string> = {
    A: "Aの初回説明を確認する",
    B: "Bの確認済み状態を確認する",
  };

  await page.route(/.*\/(?:api\/)?session$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: accounts[currentAccount],
      }),
    });
  });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    const introSeen = Boolean(accounts[currentAccount].feed_intro_seen_at);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: introSeen,
        feed_access_pending: !introSeen,
        remaining_seconds: introSeen ? 180 : 0,
        feed_access_expires_at: introSeen
          ? new Date(Date.now() + 180_000).toISOString()
          : null,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    if (failNextStart) {
      failNextStart = false;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ status: "error", errors: ["開始失敗"] }),
      });
      return;
    }

    const seenAt =
      accounts[currentAccount].feed_intro_seen_at ?? new Date().toISOString();
    accounts[currentAccount].feed_intro_seen_at ??= seenAt;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_intro_seen_at: seenAt,
        feed_access_expires_at: new Date(Date.now() + 180_000).toISOString(),
      }),
    });
  });
  await page.evaluate(() => {
    localStorage.setItem("onestep-feed-intro-seen", "true");
  });

  const completeTaskAndOpenFeed = async (account: keyof typeof accounts) => {
    await page
      .getByRole("textbox", { name: "今できること" })
      .fill(taskTitles[account]);
    await page.getByRole("button", { name: "始める" }).click();
    await page.getByRole("button", { name: "できた！" }).click();
    await page.getByRole("link", { name: "みんなを見る" }).click();
  };

  await page.goto("/home");
  await completeTaskAndOpenFeed("B");
  await expect(
    page.getByRole("dialog", { name: "利用時間は3分限定！" }),
  ).toHaveCount(0);

  currentAccount = "A";
  await page.evaluate(() => {
    sessionStorage.removeItem("onestep-active-home-view");
  });
  await page.reload();
  await completeTaskAndOpenFeed("A");

  const introDialog = page.getByRole("dialog", {
    name: "利用時間は3分限定！",
  });
  await expect(introDialog).toBeVisible();

  failNextStart = true;
  await introDialog.getByRole("button", { name: "OK" }).click();
  await expect(introDialog).toBeVisible();
  expect(accounts.A.feed_intro_seen_at).toBeNull();

  await introDialog.getByRole("button", { name: "OK" }).click();
  await expect(introDialog).toHaveCount(0);
  expect(accounts.A.feed_intro_seen_at).not.toBeNull();
  expect(accounts.B.feed_intro_seen_at).toBe("2026-09-18T03:00:00.000Z");

  await page.getByRole("link", { name: "ホーム" }).click();
  await page.getByRole("link", { name: "投稿" }).click();
  await expect(introDialog).toHaveCount(0);
});

test("再読み込み・再訪・再ログイン後も最初のフィード閲覧期限を引き継ぐ", async ({
  page,
}) => {
  const fixedTime = new Date("2026-09-15T03:00:00.000Z");
  const feedAccessExpiresAt = new Date(
    fixedTime.getTime() + 3 * 60 * 1000,
  ).toISOString();
  const returnedExpirations: string[] = [];
  let serverRemainingSeconds = 180;

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: serverRemainingSeconds,
        feed_intro_seen_at: "2026-09-01T00:00:00.000Z",
        feed_access_expires_at: feedAccessExpiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    returnedExpirations.push(feedAccessExpiresAt);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: serverRemainingSeconds,
        feed_access_expires_at: feedAccessExpiresAt,
        data: [],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?logout$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });
  await mockLogin(page, {
    status: 200,
    body: {
      status: "success",
      data: {
        id: 1,
        name: "おこめ",
        email: "okome@example.com",
        avatar_key: "avatar-1",
      },
    },
  });

  await gotoHome(page);
  await page.evaluate(() => {
    localStorage.setItem("onestep-feed-intro-seen", "true");
  });
  await page.getByRole("link", { name: "投稿" }).click();
  await expect(page.getByLabel("残り 03:00")).toBeVisible();

  await page.clock.runFor(60_000);
  serverRemainingSeconds = 120;
  await expect(page.getByLabel("残り 02:00")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("残り 02:00")).toBeVisible();

  await page.getByRole("link", { name: "ホーム" }).click();
  await page.getByRole("link", { name: "投稿" }).click();
  await expect(page.getByLabel("残り 02:00")).toBeVisible();

  await page.getByRole("link", { name: "プロフィール" }).click();
  await page.getByRole("button", { name: "設定" }).click();
  await page.getByRole("button", { name: "ログアウト" }).click();
  await page
    .getByRole("dialog", { name: "ログアウトしますか？" })
    .getByRole("button", { name: "ログアウト" })
    .click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード").fill("password1");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("link", { name: "投稿" }).click();
  await expect(page.getByLabel("残り 02:00")).toBeVisible();

  expect(returnedExpirations.length).toBeGreaterThanOrEqual(4);
  expect(new Set(returnedExpirations)).toEqual(new Set([feedAccessExpiresAt]));
});

test("タブ復帰時に同じ絶対期限から残り時間を補正する", async ({ page }) => {
  const fixedTime = new Date("2026-09-20T03:00:00.000Z");
  const expiresAt = new Date(fixedTime.getTime() + 180_000).toISOString();
  let feedRequests = 0;
  let accessRequests = 0;
  let cableTokenRequests = 0;
  let serverRemainingSeconds = 180;
  let releaseSync!: () => void;
  const syncGate = new Promise<void>((resolve) => {
    releaseSync = resolve;
  });

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
        feed_access_expires_at: expiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed(?:\?.*)?$/, async (route) => {
    feedRequests += 1;
    if (feedRequests > 1) {
      await syncGate;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: true,
        feed_access_pending: false,
        remaining_seconds: serverRemainingSeconds,
        feed_access_expires_at: expiresAt,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [
          {
            id: 211,
            user_name: "同期確認ユーザー",
            task_title: "復帰後も同じ期限を使う",
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            comments: [],
            created_at: fixedTime.toISOString(),
          },
        ],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?cable_token$/, async (route) => {
    cableTokenRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", token: "fa-11-token" }),
    });
  });

  await gotoHome(page, "/home", {
    feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
  });
  await page.getByRole("link", { name: "投稿" }).click();
  await expect(page.getByLabel("残り 03:00")).toBeVisible();
  await expect.poll(() => cableTokenRequests).toBe(1);

  await page.clock.runFor(60_000);
  await expect(page.getByLabel("残り 02:00")).toBeVisible();

  serverRemainingSeconds = 30;
  await page.clock.fastForward(90_000);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });

  await expect.poll(() => feedRequests).toBe(2);
  const feedList = page.locator(".feed-list");
  await expect(feedList).toHaveAttribute("aria-hidden", "true");
  await expect(feedList).toHaveAttribute("inert", "");
  expect(cableTokenRequests).toBe(1);

  releaseSync();
  await expect(page.getByLabel("残り 00:30")).toBeVisible();
  await expect(feedList).not.toHaveAttribute("aria-hidden", "true");
  await expect(feedList).not.toHaveAttribute("inert", "");
  await expect.poll(() => cableTokenRequests).toBe(2);
  expect(feedRequests).toBe(2);
  expect(accessRequests).toBe(1);
});

test("期限を超えてからタブへ復帰すると直ちに閲覧を終了する", async ({
  page,
}) => {
  const fixedTime = new Date("2026-09-20T03:00:00.000Z");
  const expiresAt = new Date(fixedTime.getTime() + 180_000).toISOString();
  let feedRequests = 0;
  let accessRequests = 0;
  let cableTokenRequests = 0;
  let likeRequests = 0;
  let commentRequests = 0;

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
        feed_access_expires_at: expiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed(?:\?.*)?$/, async (route) => {
    feedRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: true,
        feed_access_pending: false,
        remaining_seconds: 180,
        feed_access_expires_at: expiresAt,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [
          {
            id: 212,
            user_name: "期限確認ユーザー",
            task_title: "期限後は操作しない",
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            comments: [],
            created_at: fixedTime.toISOString(),
          },
        ],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?cable_token$/, async (route) => {
    cableTokenRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", token: "fa-11-token" }),
    });
  });
  await page.route(/.*\/(?:api\/)?completion_posts\/212\/likes$/, async (route) => {
    likeRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });
  await page.route(
    /.*\/(?:api\/)?completion_posts\/212\/comments(?:\?.*)?$/,
    async (route) => {
      commentRequests += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          pagination: { page: 1, per_page: 20, has_more: false },
          data: [],
        }),
      });
    },
  );

  await gotoHome(page, "/home", {
    feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
  });
  await page.getByRole("link", { name: "投稿" }).click();
  await expect(page.getByLabel("残り 03:00")).toBeVisible();
  await expect.poll(() => cableTokenRequests).toBe(1);
  const requestsBeforeResume = feedRequests;

  await page.clock.fastForward(181_000);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });

  await expect(page.getByLabel("残り 00:00")).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "3分経過しました" }),
  ).toBeVisible();
  const feedList = page.locator(".feed-list");
  await expect(feedList).toHaveAttribute("aria-hidden", "true");
  await expect(feedList).toHaveAttribute("inert", "");
  await expect(
    page.locator(".feed-reaction").first().click({ trial: true, timeout: 500 }),
  ).rejects.toThrow();
  await expect(
    page
      .getByRole("button", { name: "期限確認ユーザーさんのコメントを開く" })
      .click({ trial: true, timeout: 500 }),
  ).rejects.toThrow();
  expect(feedRequests).toBe(requestsBeforeResume);
  expect(likeRequests).toBe(0);
  expect(commentRequests).toBe(0);
  expect(cableTokenRequests).toBe(1);
  expect(accessRequests).toBe(1);
});

test("タブ復帰時の同期失敗後は投稿を保持してGETだけを再試行する", async ({
  page,
}) => {
  const fixedTime = new Date("2026-09-20T03:00:00.000Z");
  const expiresAt = new Date(fixedTime.getTime() + 180_000).toISOString();
  let feedRequests = 0;
  let accessRequests = 0;
  let cableTokenRequests = 0;

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
        feed_access_expires_at: expiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed(?:\?.*)?$/, async (route) => {
    feedRequests += 1;
    if (feedRequests === 2) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: "error",
          errors: ["一時的に同期できません"],
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: true,
        feed_access_pending: false,
        remaining_seconds: feedRequests === 1 ? 180 : 60,
        feed_access_expires_at: expiresAt,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [
          {
            id: 213,
            user_name: "同期再試行ユーザー",
            task_title: "同期失敗後も投稿を残す",
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            can_like: true,
            can_comment: true,
            likes_count: 0,
            comments_count: 0,
            liked_by_me: false,
            comments: [],
            created_at: fixedTime.toISOString(),
          },
        ],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?cable_token$/, async (route) => {
    cableTokenRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", token: "fa-11-token" }),
    });
  });

  await gotoHome(page, "/home", {
    feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
  });
  await page.getByRole("link", { name: "投稿" }).click();
  await expect(page.getByText("同期失敗後も投稿を残す")).toBeVisible();
  await expect.poll(() => cableTokenRequests).toBe(1);

  await page.clock.setSystemTime(
    new Date(fixedTime.getTime() + 120_000),
  );
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });

  await expect(page.getByRole("alert")).toContainText("一時的に同期できません");
  await expect(page.getByText("同期失敗後も投稿を残す")).toBeAttached();
  const feedList = page.locator(".feed-list");
  await expect(feedList).toHaveAttribute("aria-hidden", "true");
  await expect(feedList).toHaveAttribute("inert", "");
  expect(feedRequests).toBe(2);
  expect(accessRequests).toBe(1);
  expect(cableTokenRequests).toBe(1);

  await page.getByRole("button", { name: "再読み込み" }).click();
  await expect(page.getByLabel("残り 01:00")).toBeVisible();
  await expect(feedList).not.toHaveAttribute("aria-hidden", "true");
  await expect(feedList).not.toHaveAttribute("inert", "");
  await expect.poll(() => cableTokenRequests).toBe(2);
  expect(feedRequests).toBe(3);
  expect(accessRequests).toBe(1);
});

test("端末時刻を過去へ変更しても停止せず復帰時にサーバー残秒へ補正する", async ({
  page,
}) => {
  const fixedTime = new Date("2026-09-20T03:00:00.000Z");
  const expiresAt = new Date(fixedTime.getTime() + 180_000).toISOString();
  let feedRequests = 0;
  let accessRequests = 0;
  let serverRemainingSeconds = 180;

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
        feed_access_expires_at: expiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed(?:\?.*)?$/, async (route) => {
    feedRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: true,
        feed_access_pending: false,
        remaining_seconds: serverRemainingSeconds,
        feed_access_expires_at: expiresAt,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [],
      }),
    });
  });

  await gotoHome(page, "/home", {
    feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
  });
  await page.getByRole("link", { name: "投稿" }).click();
  await page.clock.runFor(60_000);
  await expect(page.getByLabel("残り 02:00")).toBeVisible();

  await page.clock.setSystemTime(
    new Date(fixedTime.getTime() - 5 * 60_000),
  );
  await page.clock.runFor(3_000);
  await expect(page.getByLabel("残り 01:57")).toBeVisible();

  serverRemainingSeconds = 110;
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect.poll(() => feedRequests).toBe(2);
  await expect(page.getByLabel("残り 01:50")).toBeVisible();
  await page.clock.runFor(2_000);
  await expect(page.getByLabel("残り 01:48")).toBeVisible();
  expect(accessRequests).toBe(1);
  expect(expiresAt).toBe("2026-09-20T03:03:00.000Z");
});

test("端末時刻を未来へ変更してもサーバー確認前に早期終了しない", async ({
  page,
}) => {
  const fixedTime = new Date("2026-09-20T03:00:00.000Z");
  const expiresAt = new Date(fixedTime.getTime() + 180_000).toISOString();
  let feedRequests = 0;
  let accessRequests = 0;
  let serverRemainingSeconds = 180;

  await page.clock.install({ time: fixedTime });
  await mockTaskAndFeedApi(page);
  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    accessRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 180,
        feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
        feed_access_expires_at: expiresAt,
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?feed(?:\?.*)?$/, async (route) => {
    feedRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_allowed: true,
        feed_access_pending: false,
        remaining_seconds: serverRemainingSeconds,
        feed_access_expires_at: expiresAt,
        pagination: { page: 1, per_page: 20, has_more: false },
        data: [],
      }),
    });
  });

  await gotoHome(page, "/home", {
    feed_intro_seen_at: "2026-09-19T03:00:00.000Z",
  });
  await page.getByRole("link", { name: "投稿" }).click();
  await expect(page.getByLabel("残り 03:00")).toBeVisible();

  await page.clock.setSystemTime(
    new Date(fixedTime.getTime() + 10 * 60_000),
  );
  await page.clock.runFor(1_000);
  await expect(
    page.getByRole("dialog", { name: "3分経過しました" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("残り 02:59")).toBeVisible();

  serverRemainingSeconds = 170;
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect.poll(() => feedRequests).toBe(2);
  await expect(page.getByLabel("残り 02:50")).toBeVisible();
  await page.clock.runFor(2_000);
  await expect(page.getByLabel("残り 02:48")).toBeVisible();
  expect(accessRequests).toBe(1);
  expect(expiresAt).toBe("2026-09-20T03:03:00.000Z");
});
