import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const authSessionStorageKey = "onestep-auth-session";
const signupCompleteStorageKey = "onestep-signup-complete";
const sessionRoute = /.*\/(?:api\/)?session$/;
const myPageRoute = /.*\/(?:api\/)?mypage(?:\?[^#]*)?$/;
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

  await page.route(/.*\/(?:api\/)?feed\/access$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        remaining_seconds: 3 * 60,
        feed_access_expires_at: new Date(
          Date.now() + 3 * 60 * 1000,
        ).toISOString(),
      }),
    });
  });
}

export async function prepareAppTest(page: Page) {
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
}

export {
  activeTaskRoute,
  authSessionStorageKey,
  expect,
  gotoHome,
  gotoSignup,
  markLoggedIn,
  mockLogin,
  myPageRoute,
  mockPasswordReset,
  mockSession,
  mockSignupEmailCheck,
  mockTaskAndFeedApi,
  test,
};
