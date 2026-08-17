import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const isTruthy = (value: string | undefined) =>
  value === "1" || value === "true" || value === "yes";

const backendURL =
  process.env.E2E_BACKEND_URL ||
  (isTruthy(process.env.E2E_USE_DOCKER)
    ? "http://127.0.0.1:3000"
    : "http://127.0.0.1:3001");
const authSessionStorageKey = "onestep-auth-session";
const signupCompleteStorageKey = "onestep-signup-complete";
const sessionRoute = /.*\/(?:api\/)?session$/;
const myPageRoute = /.*\/(?:api\/)?mypage$/;
const cableTokenRoute = /.*\/(?:api\/)?cable_token$/;
const activeTaskRoute = /.*\/(?:api\/)?tasks\/active$/;

async function mockSession(page: Page, authenticated: boolean) {
  await page.unroute(sessionRoute);
  await page.route(sessionRoute, async (route) => {
    await route.fulfill({
      status: authenticated ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(
        authenticated
          ? {
              status: "success",
              data: {
                id: 1,
                name: "おこめ",
                email: "okome@example.com",
                avatar_key: "avatar-1",
              },
            }
          : { status: "error", errors: ["認証が必要です"] },
      ),
    });
  });
  await page.unroute(activeTaskRoute);
  await page.route(activeTaskRoute, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: null }),
    });
  });
}

async function markLoggedIn(page: Page) {
  await mockSession(page, true);
  await page.evaluate(
    ({ authKey, profileKey }) => {
      localStorage.setItem(authKey, "active");
      localStorage.setItem(
        profileKey,
        JSON.stringify({
          id: 1,
          name: "おこめ",
          email: "okome@example.com",
          avatarId: "avatar-1",
        }),
      );
    },
    {
      authKey: authSessionStorageKey,
      profileKey: signupCompleteStorageKey,
    },
  );
}

async function mockAuthenticatedBackgroundApis(page: Page) {
  await page.route(myPageRoute, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
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
  await page.route(cableTokenRoute, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", token: "e2e-cable-token" }),
    });
  });
}

async function gotoHome(page: Page, path = "/home") {
  await markLoggedIn(page);
  await page.goto(path);
}

async function gotoSignup(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "新規登録" }).click();
}

async function mockSignupEmailCheck(page: Page) {
  await page.route(/.*\/(?:api\/)?signup\/email_check$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });
}

async function mockLogin(
  page: Page,
  response: { status: number; body: Record<string, unknown> },
) {
  if (response.status >= 200 && response.status < 300) {
    await mockSession(page, true);
  }

  await page.route(/.*\/(?:api\/)?login$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });
}

async function mockPasswordReset(page: Page) {
  await page.route(/.*\/(?:api\/)?password_reset$/, async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          message:
            "登録されているメールアドレスの場合、再設定用コードを送信しました",
        }),
      });
      return;
    }

    if (method === "PATCH") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          message: "パスワードを再設定しました",
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route(/.*\/(?:api\/)?password_reset\/verify$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        message: "認証コードを確認しました",
      }),
    });
  });
}

async function mockTaskAndFeedApi(page: Page) {
  let taskId = 1;
  let activeTask = "";
  let completionPostId = 1;
  let completedAt: string | null = null;
  const completionComments = [
    "頑張れ！",
    "ファイト🔥",
    "今日も一歩進めていてすごい！その調子で次の一歩も応援してるよ",
    "応援してる！",
    "集中できたのすごい！",
    "その一歩が未来につながってるよ",
    "ナイスチャレンジ✨",
    "最後までやり切ったね！",
    "次も一緒に進もう！",
  ];

  const completionPostComments = () =>
    completedAt
      ? completionComments.map((body, index) => ({
          id: index + 1,
          user_id: index + 2,
          user_name: `応援ユーザー${index + 1}`,
          avatar_key: `avatar-${(index % 8) + 1}`,
          body,
          post_status_when_commented: "doing",
          created_at: new Date(
            Date.now() - (completionComments.length - index) * 1000,
          ).toISOString(),
        }))
      : [];

  await page.route(/.*\/(?:api\/)?tasks$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    const body = route.request().postDataJSON() as {
      task?: { title?: string };
    };
    activeTask = body.task?.title ?? "";

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: taskId,
          title: activeTask,
          status: "pending",
        },
      }),
    });
  });

  await page.route(/.*\/(?:api\/)?tasks\/\d+\/start$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: taskId,
          title: activeTask,
          status: "active",
          started_at: new Date().toISOString(),
          completion_post_id: completionPostId,
        },
      }),
    });
  });

  await page.route(/.*\/(?:api\/)?tasks\/\d+\/complete$/, async (route) => {
    completedAt = new Date().toISOString();

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: taskId,
          title: activeTask,
          status: "completed",
          completed_at: completedAt,
          completion_post_id: completionPostId,
          completion_post: {
            id: completionPostId,
            status: "completed",
            status_label: "できた",
            card_variant: "completed",
            likes_count: 12,
            comments_count: completionComments.length,
            liked_by_me: false,
            comments: completionPostComments(),
            created_at: new Date().toISOString(),
            completed_at: completedAt,
          },
        },
      }),
    });
  });

  await page.route(/.*\/(?:api\/)?tasks\/\d+$/, async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.fallback();
      return;
    }

    activeTask = "";
    completedAt = null;

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });

  await page.route(/.*\/(?:api\/)?feed$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 3 * 60,
        feed_access_expires_at: new Date(
          Date.now() + 3 * 60 * 1000,
        ).toISOString(),
        data: activeTask
          ? [
              {
                id: completionPostId,
                user_name: "おこめ",
                level: 1,
                task_title: activeTask,
                status: completedAt ? "completed" : "doing",
                status_label: completedAt ? "できた" : "やります",
                card_variant: completedAt ? "completed" : "doing",
                is_mine: true,
                can_like: false,
                can_comment: false,
                likes_count: completedAt ? 12 : 0,
                comments_count: completedAt ? completionComments.length : 0,
                liked_by_me: false,
                comments: completionPostComments(),
                created_at: new Date().toISOString(),
                completed_at: completedAt,
              },
            ]
          : [],
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockAuthenticatedBackgroundApis(page);
  await mockSession(page, false);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
});

test("未ログイン時にウェルカム画面から認証画面へ遷移できる", async ({
  page,
}) => {
  await expect(page.getByAltText("OneStep Nowのロゴ")).toHaveAttribute(
    "src",
    "/favicon.svg",
  );
  await expect(page.getByText("今できることから、")).toBeVisible();
  await expect(page.getByText("一歩ずつ。")).toBeVisible();
  await expect(
    page.getByText("考える前に、まずひとつ始めよう。"),
  ).toBeVisible();

  await page.getByRole("link", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "新規登録" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
});

test("バックエンドのヘルスチェックが成功する", async ({ request }) => {
  const response = await request.get(`${backendURL}/up`);

  expect(response.status()).toBe(200);
});

test("バックエンドにデフォルトアイコンで登録できる", async ({ request }) => {
  const email = `e2e+${Date.now()}@example.com`;
  const response = await request.post(`${backendURL}/signup`, {
    headers: { Origin: "http://localhost:5173" },
    data: {
      user: {
        name: "E2E登録",
        email,
        password: "password1",
        password_confirmation: "password1",
        avatar_key: "avatar-1",
      },
    },
  });

  expect(response.status()).toBe(201);
  await expect(response).toBeOK();

  const body = await response.json();
  expect(body).toMatchObject({
    status: "success",
    data: {
      name: "E2E登録",
      email,
      avatar_key: "avatar-1",
    },
  });
});

test("バックエンドで保存せずにメールアドレスの重複を確認できる", async ({
  request,
}) => {
  const email = `e2e-check+${Date.now()}@example.com`;
  const response = await request.post(`${backendURL}/signup/email_check`, {
    headers: { Origin: "http://localhost:5173" },
    data: {
      user: {
        email,
      },
    },
  });

  expect(response.status()).toBe(200);
  await expect(response).toBeOK();

  const body = await response.json();
  expect(body).toMatchObject({ status: "success" });
});

test("バックエンドでログインできる", async ({ request }) => {
  const email = `e2e-login+${Date.now()}@example.com`;
  await request.post(`${backendURL}/signup`, {
    headers: { Origin: "http://localhost:5173" },
    data: {
      user: {
        name: "E2Eログイン",
        email,
        password: "password1",
        password_confirmation: "password1",
        avatar_key: "avatar-1",
      },
    },
  });

  const response = await request.post(`${backendURL}/login`, {
    headers: { Origin: "http://localhost:5173" },
    data: {
      user: {
        email,
        password: "password1",
      },
    },
  });

  expect(response.status()).toBe(200);
  await expect(response).toBeOK();

  const body = await response.json();
  expect(body).toMatchObject({
    status: "success",
    data: {
      name: "E2Eログイン",
      email,
    },
  });
});

test("フロントエンドの新規登録画面が表示される", async ({ page }) => {
  await gotoSignup(page);

  await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
  await expect(page.getByLabel("表示名")).toBeVisible();
  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByLabel("パスワード", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("パスワード確認", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "登録" })).toBeVisible();
});

test("新規登録画面の入力欄の幅が揃っている", async ({ page }) => {
  await gotoSignup(page);

  const inputWidths = await page.evaluate(() => {
    const targets = ["name", "email", "password", "passwordConfirmation"];

    return targets.map((id) => {
      const input = document.getElementById(id);
      const box = id.startsWith("password")
        ? input?.closest(".password-field")
        : input;

      return Math.round(box?.getBoundingClientRect().width ?? 0);
    });
  });

  expect(new Set(inputWidths).size).toBe(1);
});

test("新規登録画面のリロード後も名前とメールアドレスを保持する", async ({
  page,
}) => {
  await gotoSignup(page);

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await page.reload();

  await expect(page.getByLabel("表示名")).toHaveValue("おこめ");
  await expect(page.getByLabel("メールアドレス")).toHaveValue(
    "okome@example.com",
  );
  await expect(page.getByPlaceholder("パスワードを入力")).toHaveValue("");
  await expect(page.getByPlaceholder("パスワードを再入力")).toHaveValue("");
});

test("パスワードの表示と非表示を切り替えられる", async ({ page }) => {
  await gotoSignup(page);

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
  await gotoSignup(page);

  const passwordInput = page.getByPlaceholder("パスワードを入力");
  const confirmationInput = page.getByPlaceholder("パスワードを再入力");

  await passwordInput.fill("あああabc123");
  await confirmationInput.fill("テストpass456");

  await expect(passwordInput).toHaveValue("abc123");
  await expect(confirmationInput).toHaveValue("pass456");
});

test("パスワードは英字と数字の両方が必要", async ({ page }) => {
  await gotoSignup(page);

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(
    page.getByText("※8文字以上で英字と数字を含めてください"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "アイコンを選ぼう！" }),
  ).toHaveCount(0);

  await page.getByPlaceholder("パスワードを入力").fill("12345678");
  await page.getByPlaceholder("パスワードを再入力").fill("12345678");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(
    page.getByText("※8文字以上で英字と数字を含めてください"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "アイコンを選ぼう！" }),
  ).toHaveCount(0);
});

test("入力エラーをフォーム内に表示する", async ({ page }) => {
  await gotoSignup(page);

  const submitButton = page.getByRole("button", { name: "登録" });
  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await submitButton.click();

  await expect(
    page.getByText("@を含む正しいメールアドレスを入力してください"),
  ).toBeVisible();
  await expect(page.getByLabel("メールアドレス")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("ログイン画面の入力エラーをフォーム内に表示する", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(
    page.getByText("メールアドレスを入力してください"),
  ).toBeVisible();
  await expect(page.getByText("パスワードを入力してください")).toBeVisible();
  await expect(page.getByLabel("メールアドレス")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("パスワード")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("ログイン画面の新規登録リンクは登録入力画面へ遷移する", async ({
  page,
}) => {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.setItem(
      "onestep-signup-complete",
      JSON.stringify({
        id: 1,
        name: "おこめ",
        email: "okome@example.com",
        avatarId: "avatar-1",
      }),
    );
    sessionStorage.setItem("onestep-signup-screen", "complete");
  });

  await page.getByRole("link", { name: "新規登録" }).click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "登録が完了しました！" }),
  ).toHaveCount(0);
});

test("ログイン画面からログインできる", async ({ page }) => {
  await mockLogin(page, {
    status: 200,
    body: {
      status: "success",
      data: { id: 1, name: "おこめ", email: "okome@example.com" },
    },
  });
  await page.goto("/login");

  await expect(
    page.getByRole("link", { name: "パスワードを忘れた方はこちら" }),
  ).toBeVisible();
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード").fill("password1");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key), authSessionStorageKey),
    )
    .toBe("active");
});

test("ログイン済みならアプリを開いたときにホーム画面を表示する", async ({
  page,
}) => {
  await mockLogin(page, {
    status: 200,
    body: {
      status: "success",
      data: { id: 1, name: "おこめ", email: "okome@example.com" },
    },
  });
  await page.goto("/login");

  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード").fill("password1");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto("/");

  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
});

test("未ログインでホーム画面を開くとウェルカム画面を表示する", async ({
  page,
}) => {
  await page.goto("/home");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
});

test("ログアウトするとログイン状態を削除してログイン画面へ遷移する", async ({
  page,
}) => {
  await gotoHome(page);

  await page.getByRole("link", { name: "プロフィール" }).click();
  await page.getByRole("button", { name: "設定" }).click();
  await page.getByRole("button", { name: "ログアウト" }).click();
  const dialog = page.getByRole("dialog", { name: "ログアウトしますか？" });
  await expect(dialog).toBeVisible();
  await mockSession(page, false);
  await page.route(/.*\/(?:api\/)?logout$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });
  await dialog.getByRole("button", { name: "ログアウト" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key), authSessionStorageKey),
    )
    .toBeNull();

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
});

test("ログイン情報が違う場合はエラーを表示する", async ({ page }) => {
  await mockLogin(page, {
    status: 401,
    body: {
      status: "error",
      errors: ["メールアドレスまたはパスワードが違います"],
    },
  });
  await page.goto("/login");

  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード").fill("wrongpass1");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(
    page.getByText("メールアドレスまたはパスワードが違います"),
  ).toBeVisible();
  await expect(page.getByLabel("パスワード")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page).toHaveURL(/\/login$/);
});

test("ログイン画面からパスワードを再設定できる", async ({ page }) => {
  await mockPasswordReset(page);
  await page.goto("/login");

  await page
    .getByRole("link", { name: "パスワードを忘れた方はこちら" })
    .click();
  await expect(
    page.getByRole("heading", { name: "パスワード再設定" }),
  ).toBeVisible();

  await page.getByLabel("メールアドレス").fill("reset@example.com");
  await page.getByRole("button", { name: "コードを送信" }).click();
  await expect(
    page.getByText(
      "登録されているメールアドレスの場合、再設定用コードを送信しました",
    ),
  ).toBeVisible();

  await page.getByLabel("認証コード").fill("123456");
  await page.getByRole("button", { name: "コードを確認" }).click();
  await expect(
    page.getByLabel("新しいパスワード", { exact: true }),
  ).toBeVisible();

  await page.getByLabel("新しいパスワード", { exact: true }).fill("newpass1");
  await page
    .getByLabel("新しいパスワード確認", { exact: true })
    .fill("newpass1");
  await page.getByRole("button", { name: "再設定" }).click();

  await expect(page).toHaveURL(/\/login$/);
});

test("登録後にアイコン選択画面へ進む", async ({ page }) => {
  const signupRequests: unknown[] = [];
  await mockSignupEmailCheck(page);
  await page.route(/.*\/(?:api\/)?signup$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    signupRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { id: 1, name: "おこめ", email: "okome@example.com" },
      }),
    });
  });

  await gotoSignup(page);

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await page.getByRole("button", { name: "登録" }).click();

  expect(signupRequests).toHaveLength(0);
  await expect(
    page.getByRole("heading", { name: "アイコンを選ぼう！" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "アイコン1" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("radio", { name: "アイコン5" }).click();
  await expect(page.getByRole("radio", { name: "アイコン5" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("radio", { name: "写真未選択" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "写真を選ぶ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "カメラで撮影" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "写真を選択" })).toHaveCount(0);
  await expect(page.getByLabel("撮影する写真")).toHaveAttribute(
    "accept",
    "image/*",
  );
  await expect(page.getByLabel("撮影する写真")).toHaveAttribute(
    "capture",
    "user",
  );
  await expect(page.getByLabel("選択する写真")).toHaveAttribute(
    "accept",
    "image/*",
  );
  await page.getByLabel("選択する写真").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByRole("radio", { name: "選択した写真" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "アイコンを選ぼう！" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "写真未選択" })).toBeDisabled();
  await page.getByRole("radio", { name: "アイコン5" }).click();
  await page.getByRole("button", { name: "決定" }).click();
  await expect(
    page.getByRole("heading", { name: "登録が完了しました！" }),
  ).toBeVisible();
  await expect(page.getByText("おこめ")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "最初の一歩を始める" }),
  ).toBeVisible();
  const pageSize = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(pageSize.scrollHeight).toBeLessThanOrEqual(pageSize.height);

  await mockSession(page, true);
  await page.goto("/");
  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();

  expect(signupRequests).toEqual([
    {
      user: {
        name: "おこめ",
        email: "okome@example.com",
        password: "password1",
        password_confirmation: "password1",
        avatar_key: "avatar-5",
      },
    },
  ]);
});

test("ホーム画面が表示される", async ({ page }) => {
  await gotoHome(page);

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

test("ホーム画面は末尾スラッシュ付きでも表示される", async ({ page }) => {
  await gotoHome(page, "/home/");

  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "今できること" }),
  ).toBeVisible();
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
  await page.getByRole("link", { name: "プロフィール" }).click();
  achievementCard = page.locator(".profile-achievement-card").filter({
    hasText: "同期を確認するタスク",
  });
  await expect(
    achievementCard.locator(".achievement-reaction-button").nth(1),
  ).toContainText("1");
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

  await page.route(/.*\/(?:api\/)?mypage$/, async (route) => {
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

test("登録済みメールアドレスは新規登録時にエラーを表示する", async ({
  page,
}) => {
  const signupRequests: unknown[] = [];
  await page.route(/.*\/(?:api\/)?signup\/email_check$/, async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        status: "error",
        errors: ["Email has already been taken"],
      }),
    });
  });
  await page.route(/.*\/(?:api\/)?signup$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    signupRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { id: 1, name: "おこめ", email: "okome@example.com" },
      }),
    });
  });

  await gotoSignup(page);

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(
    page.getByText("このメールアドレスはすでに登録されています。"),
  ).toBeVisible();
  await expect(page.getByLabel("メールアドレス")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "アイコンを選ぼう！" }),
  ).toHaveCount(0);
  expect(signupRequests).toHaveLength(0);
});

test("スマホでは写真の選び方を下に並べて表示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSignupEmailCheck(page);
  await page.route(/.*\/(?:api\/)?signup$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { id: 1, name: "おこめ", email: "okome@example.com" },
      }),
    });
  });

  await gotoSignup(page);

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(page.getByRole("radio", { name: "写真未選択" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "カメラで撮影" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "写真を選ぶ" })).toBeVisible();
});

test("スマホで写真の選択肢を表示しても決定ボタンの位置は変わらない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSignupEmailCheck(page);
  await page.route(/.*\/(?:api\/)?signup$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { id: 1, name: "おこめ", email: "okome@example.com" },
      }),
    });
  });

  await gotoSignup(page);

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await page.getByRole("button", { name: "登録" }).click();

  const submitButton = page.getByRole("button", { name: "決定" });
  const beforeOpenBox = await submitButton.boundingBox();
  await expect(
    page.getByRole("button", { name: "カメラで撮影" }),
  ).toBeVisible();
  const afterOpenBox = await submitButton.boundingBox();

  expect(afterOpenBox?.y).toBeCloseTo(beforeOpenBox?.y ?? 0, 0);
});

test("選んだ写真を登録APIに送信して完了画面でも保持する", async ({ page }) => {
  const signupRequests: unknown[] = [];
  await mockSignupEmailCheck(page);
  await page.route(/.*\/(?:api\/)?signup$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const requestBody = route.request().postDataJSON();
    signupRequests.push(requestBody);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: 1,
          name: "おこめ",
          email: "okome-photo@example.com",
          avatar_key: requestBody.user.avatar_key,
        },
      }),
    });
  });

  await gotoSignup(page);

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome-photo@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await page.getByRole("button", { name: "登録" }).click();
  await page.getByLabel("選択する写真").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "決定" }).click();

  await expect(
    page.getByRole("heading", { name: "登録が完了しました！" }),
  ).toBeVisible();
  await mockSession(page, true);
  await page.goto("/");
  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("heading", { name: "OneStep Now" }),
  ).toBeVisible();

  expect(signupRequests).toHaveLength(1);
  expect(signupRequests[0]).toMatchObject({
    user: {
      name: "おこめ",
      email: "okome-photo@example.com",
      password: "password1",
      password_confirmation: "password1",
      avatar_key: expect.stringMatching(/^data:image\/jpeg;base64,/),
    },
  });
});
