import { defineConfig, devices } from "@playwright/test";

const isTruthy = (value: string | undefined) =>
  value === "1" || value === "true" || value === "yes";

const useDocker = isTruthy(process.env.E2E_USE_DOCKER);
const skipWebServer = isTruthy(process.env.E2E_SKIP_WEBSERVER);
const frontendURL = process.env.BASE_URL || "http://127.0.0.1:5173";
const backendURL =
  process.env.E2E_BACKEND_URL ||
  (useDocker ? "http://127.0.0.1:3000" : "http://127.0.0.1:3001");

const localWebServer = [
  {
    command: "node scripts/start-rails-e2e.mjs",
    url: `${backendURL}/up`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  },
  {
    command: "npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173",
    url: frontendURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  },
];

const dockerWebServer = [
  {
    command: "docker compose up --build backend frontend",
    url: `${backendURL}/up`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
    timeout: 120 * 1000,
  },
  {
    command: 'node -e "setInterval(() => {}, 1 << 30)"',
    url: frontendURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
    timeout: 120 * 1000,
  },
];

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: frontendURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* Run your local or Docker dev server before starting the tests */
  webServer: skipWebServer
    ? undefined
    : useDocker
      ? dockerWebServer
      : localWebServer,
});
