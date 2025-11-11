import { test, expect, Locator } from "@playwright/test";

async function expectVisibleWithoutHiddenTransforms(locator: Locator) {
  await expect(locator).toBeVisible();
  const computed = await locator.evaluate((node) => {
    const styles = window.getComputedStyle(node as HTMLElement);
    return {
      opacity: parseFloat(styles.opacity),
      transform: styles.transform,
      pointerEvents: styles.pointerEvents,
    };
  });

  expect(computed.opacity).toBeGreaterThan(0.5);
  expect(computed.pointerEvents).not.toBe("none");
  expect(
    computed.transform === "none" || computed.transform === "matrix(1, 0, 0, 1, 0, 0)"
  ).toBeTruthy();
}

test.describe("layout visibility safeguards", () => {
  test("header renders immediately on the swap route", async ({ page }) => {
    await page.goto("/swap");

    const header = page.getByTestId("site-header");
    const nav = page.getByTestId("primary-nav");

    await expectVisibleWithoutHiddenTransforms(header);
    await expectVisibleWithoutHiddenTransforms(nav);
  });

  test("header and nav remain visible after navigation", async ({ page }) => {
    await page.goto("/swap");

    const header = page.getByTestId("site-header");
    await expectVisibleWithoutHiddenTransforms(header);

    await page.getByTestId("primary-nav").getByRole("link", { name: "Bridge" }).click();
    await page.waitForURL("**/bridge");

    const bridgeHeader = page.getByTestId("site-header");
    await expectVisibleWithoutHiddenTransforms(bridgeHeader);
    await expectVisibleWithoutHiddenTransforms(page.getByTestId("primary-nav"));
  });
});
