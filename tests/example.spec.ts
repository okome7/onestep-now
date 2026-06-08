import { test, expect } from "@playwright/test";

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

test("フロントエンドの新規登録画面が表示される", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
  await expect(page.getByPlaceholder("名前を入力")).toBeVisible();
  await expect(page.getByPlaceholder("メールアドレスを入力")).toBeVisible();
  await expect(page.getByPlaceholder("パスワードを入力")).toBeVisible();
  await expect(page.getByPlaceholder("パスワード確認を入力")).toBeVisible();
  await expect(page.getByRole("button", { name: "登録" })).toBeVisible();
});

test("ログイン画面が表示される", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByLabel("パスワード")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "パスワードをお忘れですか？" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  await expect(page.getByRole("link", { name: "新規登録" })).toHaveAttribute(
    "href",
    /\/$/,
  );
});

test("ログインエラーをフォーム内に表示する", async ({ page }) => {
  await page.route("**/api/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        status: "error",
        errors: ["メールアドレスまたはパスワードが正しくありません。"],
      }),
    });
  });

  await page.goto("/login");

  await page.getByLabel("メールアドレス").fill("wrong@example.com");
  await page.getByLabel("パスワード").fill("password1");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません。"),
  ).toBeVisible();
  await expect(page.getByLabel("メールアドレス")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("パスワード")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("ログインに成功したらホーム画面へ進む", async ({ page }) => {
  const loginRequests: unknown[] = [];
  await page.route("**/api/login", async (route) => {
    loginRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          id: 1,
          name: "おこめ",
          email: "okome@example.com",
          avatar_key: "avatar-1",
        },
      }),
    });
  });

  await page.goto("/login");

  await page.getByLabel("メールアドレス").fill("okome@example.com");
  await page.getByLabel("パスワード").fill("password1");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/home$/);
  expect(loginRequests).toEqual([
    {
      user: {
        email: "okome@example.com",
        password: "password1",
      },
    },
  ]);
});

test("新規登録画面のリロード後も名前とメールアドレスを保持する", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByPlaceholder("名前を入力").fill("おこめ");
  await page.getByPlaceholder("メールアドレスを入力").fill("okome@example.com");
  await page.getByPlaceholder("パスワードを入力").fill("password1");
  await page.getByPlaceholder("パスワード確認を入力").fill("password1");
  await page.reload();

  await expect(page.getByPlaceholder("名前を入力")).toHaveValue("おこめ");
  await expect(page.getByPlaceholder("メールアドレスを入力")).toHaveValue(
    "okome@example.com",
  );
  await expect(page.getByPlaceholder("パスワードを入力")).toHaveValue("");
  await expect(page.getByPlaceholder("パスワード確認を入力")).toHaveValue("");
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
  const confirmationInput = page.getByPlaceholder("パスワード確認を入力");

  await passwordInput.fill("あああabc123");
  await confirmationInput.fill("テストpass456");

  await expect(passwordInput).toHaveValue("abc123");
  await expect(confirmationInput).toHaveValue("pass456");
});

test("パスワードは英字と数字の両方が必要", async ({ page }) => {
  await page.goto("/");

  await page.getByPlaceholder("名前を入力").fill("おこめ");
  await page.getByPlaceholder("メールアドレスを入力").fill("okome@example.com");
  await page.getByPlaceholder("パスワードを入力").fill("password");
  await page.getByPlaceholder("パスワード確認を入力").fill("password");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(page.getByText("英字と数字を両方含めてください")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "アイコンを選ぼう！" }),
  ).toHaveCount(0);

  await page.getByPlaceholder("パスワードを入力").fill("12345678");
  await page.getByPlaceholder("パスワード確認を入力").fill("12345678");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(page.getByText("英字と数字を両方含めてください")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "アイコンを選ぼう！" }),
  ).toHaveCount(0);
});

test("入力エラーをフォーム内に表示する", async ({ page }) => {
  await page.goto("/");

  const submitButton = page.getByRole("button", { name: "登録" });
  const beforeSubmitBox = await submitButton.boundingBox();

  await page.getByPlaceholder("名前を入力").fill("おこめ");
  await page.getByPlaceholder("メールアドレスを入力").fill("example.com");
  await page.getByPlaceholder("パスワードを入力").fill("password1");
  await page.getByPlaceholder("パスワード確認を入力").fill("password1");
  await submitButton.click();

  await expect(
    page.getByText("@を含む正しいメールアドレスを入力してください"),
  ).toBeVisible();
  const afterSubmitBox = await submitButton.boundingBox();

  expect(afterSubmitBox?.y).toBeCloseTo(beforeSubmitBox?.y ?? 0, 0);
  await expect(page.getByPlaceholder("メールアドレスを入力")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("登録後にアイコン選択画面へ進む", async ({ page }) => {
  const signupRequests: unknown[] = [];
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

  await page.getByPlaceholder("名前を入力").fill("おこめ");
  await page.getByPlaceholder("メールアドレスを入力").fill("okome@example.com");
  await page.getByPlaceholder("パスワードを入力").fill("password1");
  await page.getByPlaceholder("パスワード確認を入力").fill("password1");
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

test("スマホでは写真の選び方を分けて表示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
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

  await page.getByPlaceholder("名前を入力").fill("おこめ");
  await page.getByPlaceholder("メールアドレスを入力").fill("okome@example.com");
  await page.getByPlaceholder("パスワードを入力").fill("password1");
  await page.getByPlaceholder("パスワード確認を入力").fill("password1");
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

  await page.getByPlaceholder("名前を入力").fill("おこめ");
  await page.getByPlaceholder("メールアドレスを入力").fill("okome@example.com");
  await page.getByPlaceholder("パスワードを入力").fill("password1");
  await page.getByPlaceholder("パスワード確認を入力").fill("password1");
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

  await page.getByPlaceholder("名前を入力").fill("おこめ");
  await page
    .getByPlaceholder("メールアドレスを入力")
    .fill("okome-photo@example.com");
  await page.getByPlaceholder("パスワードを入力").fill("password1");
  await page.getByPlaceholder("パスワード確認を入力").fill("password1");
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
