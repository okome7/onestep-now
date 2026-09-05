import {
  expect,
  gotoSignup,
  mockSession,
  mockSignupEmailCheck,
  prepareAppTest,
  test,
} from "./support/appTest";

test.beforeEach(async ({ page }) => prepareAppTest(page));

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
