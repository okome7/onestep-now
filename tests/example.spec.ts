import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function mockSignupEmailCheck(page: Page) {
  await page.route("**/api/signup/email_check", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
});

test("バックエンドのヘルスチェックが成功する", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3001/up");

  expect(response.status()).toBe(200);
});

test("バックエンドにデフォルトアイコンで登録できる", async ({ request }) => {
  const email = `e2e+${Date.now()}@example.com`;
  const response = await request.post("http://127.0.0.1:3001/signup", {
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
  const response = await request.post(
    "http://127.0.0.1:3001/signup/email_check",
    {
      data: {
        user: {
          email,
        },
      },
    },
  );

  expect(response.status()).toBe(200);
  await expect(response).toBeOK();

  const body = await response.json();
  expect(body).toMatchObject({ status: "success" });
});

test("フロントエンドの新規登録画面が表示される", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
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
  await page.goto("/");

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

  expect(new Set(inputWidths)).toHaveSize(1);
});

test("新規登録画面のリロード後も名前とメールアドレスを保持する", async ({
  page,
}) => {
  await page.goto("/");

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
  await page.goto("/");

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
  await page.goto("/");

  const passwordInput = page.getByPlaceholder("パスワードを入力");
  const confirmationInput = page.getByPlaceholder("パスワードを再入力");

  await passwordInput.fill("あああabc123");
  await confirmationInput.fill("テストpass456");

  await expect(passwordInput).toHaveValue("abc123");
  await expect(confirmationInput).toHaveValue("pass456");
});

test("パスワードは英字と数字の両方が必要", async ({ page }) => {
  await page.goto("/");

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
  await page.goto("/");

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

test("ログイン画面からログインできる", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("link", { name: "パスワードを忘れた方はこちら" }),
  ).toBeVisible();
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード").fill("password1");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/home$/);
});

test("登録後にアイコン選択画面へ進む", async ({ page }) => {
  const signupRequests: unknown[] = [];
  await mockSignupEmailCheck(page);
  await page.route("**/api/signup", async (route) => {
    signupRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { id: 1, name: "おこめ", email: "okome@example.com" },
      }),
    });
  });

  await page.goto("/");

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
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "登録が完了しました！" }),
  ).toBeVisible();
  await expect(page.getByText("おこめ")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "最初の一歩を始める" }),
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

  const pageSize = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(pageSize.scrollHeight).toBeLessThanOrEqual(pageSize.height);

  await page.getByRole("button", { name: "最初の一歩を始める" }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("登録済みメールアドレスは新規登録時にエラーを表示する", async ({
  page,
}) => {
  const signupRequests: unknown[] = [];
  await page.route("**/api/signup/email_check", async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        status: "error",
        errors: ["Email has already been taken"],
      }),
    });
  });
  await page.route("**/api/signup", async (route) => {
    signupRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { id: 1, name: "おこめ", email: "okome@example.com" },
      }),
    });
  });

  await page.goto("/");

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

test("スマホでは写真の選び方を分けて表示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSignupEmailCheck(page);
  await page.route("**/api/signup", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { id: 1, name: "おこめ", email: "okome@example.com" },
      }),
    });
  });

  await page.goto("/");

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(page.getByRole("radio", { name: "写真未選択" })).toBeDisabled();
  await page.getByRole("button", { name: "写真を選ぶ" }).click();

  await expect(
    page.getByRole("button", { name: "カメラで撮影" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "写真を選択" })).toBeVisible();
});

test("スマホで写真の選択肢を開いても決定ボタンの位置は変わらない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSignupEmailCheck(page);
  await page.route("**/api/signup", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { id: 1, name: "おこめ", email: "okome@example.com" },
      }),
    });
  });

  await page.goto("/");

  await page.getByLabel("表示名").fill("おこめ");
  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード", { exact: true }).fill("password1");
  await page.getByLabel("パスワード確認", { exact: true }).fill("password1");
  await page.getByRole("button", { name: "登録" }).click();

  const submitButton = page.getByRole("button", { name: "決定" });
  const beforeOpenBox = await submitButton.boundingBox();
  await page.getByRole("button", { name: "写真を選ぶ" }).click();
  await expect(
    page.getByRole("button", { name: "カメラで撮影" }),
  ).toBeVisible();
  const afterOpenBox = await submitButton.boundingBox();

  expect(afterOpenBox?.y).toBeCloseTo(beforeOpenBox?.y ?? 0, 0);
});

test("選んだ写真を登録APIに送信して完了画面でも保持する", async ({ page }) => {
  const signupRequests: unknown[] = [];
  await mockSignupEmailCheck(page);
  await page.route("**/api/signup", async (route) => {
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

  await page.goto("/");

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
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "登録が完了しました！" }),
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
