import { defineConfig, devices } from "@playwright/test";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT ?? "4173";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL,
    viewport: { width: 1366, height: 768 },
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
