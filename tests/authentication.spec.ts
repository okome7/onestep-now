import {
  authSessionStorageKey,
  expect,
  gotoHome,
  gotoSignup,
  mockLogin,
  mockPasswordReset,
  mockSession,
  mockSignupEmailCheck,
  prepareAppTest,
  test,
} from "./support/appTest";

test.beforeEach(async ({ page }) => prepareAppTest(page));

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
  const backButton = page.getByRole("button", { name: "戻る" });
  await expect(backButton).toHaveCSS("width", "40px");
  await expect(backButton).toHaveCSS("height", "40px");
  await expect(backButton).toHaveCSS("border-radius", "50%");
  await expect(backButton.locator("svg")).toHaveCount(1);

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
