import {
  expect,
  openDemoControls,
  openVehicleByLot,
  resetApplication,
  test,
} from "./support/app";

test.describe("browser hardening", () => {
  test.beforeEach(async ({ page }) => {
    await resetApplication(page);
  });

  test("renders a useful fallback when vehicle images fail", async ({ page }) => {
    await page.route("https://placehold.co/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: "not an image",
      });
    });
    await page.goto("/?q=A-0036");

    await expect(
      page.getByRole("img", {
        name: /2016 Jeep Wrangler, lot A-0036\. Image unavailable\./,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: /View 2016 Jeep Wrangler.*lot A-0036/ })
      .click();
    await expect(
      page.getByRole("img", {
        name: /2016 Jeep Wrangler, supplied photo 1 of 4\. Image unavailable\./,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Auction" }),
    ).toContainText("CA$12,000");
  });

  test("supports valid direct details, missing vehicles, and wildcard routes", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");
    const directPath = new URL(page.url()).pathname;

    await page.goto("/");
    await page.goto(directPath);
    await expect(
      page.getByRole("heading", { level: 1, name: "2016 Jeep Wrangler" }),
    ).toBeVisible();

    await page.goto("/vehicles/not-a-real-id");
    await expect(
      page.getByRole("heading", { name: "We couldn’t find that vehicle" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to inventory" }),
    ).toHaveAttribute("href", "/");

    await page.goto("/not-a-real-route");
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  });

  test("falls back safely from corrupt persisted data", async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem("the-block:auction-overlays", "{broken");
      window.localStorage.setItem(
        "the-block:demo-clock",
        JSON.stringify({ version: 999, clock: { status: "paused", elapsedMs: 1 } }),
      );
    });
    await page.goto("/?q=A-0036");

    const card = page.getByRole("article");
    await expect(card).toContainText("Paused · Ends in 6m 0s");
    await expect(card).toContainText("CA$12,000");
    await expect(card).toContainText("17 bids");
    await expect(card).not.toContainText("You’re leading");
  });

  test("exposes a working skip link as the first keyboard destination", async ({
    page,
  }) => {
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
  });

  test("applies the dark application color system", async ({ page }) => {
    const theme = await page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      const bodyStyles = getComputedStyle(document.body);

      return {
        colorScheme: rootStyles.colorScheme,
        pageBackground: bodyStyles.backgroundColor,
        textColor: bodyStyles.color,
        themeColor: document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      };
    });

    expect(theme).toEqual({
      colorScheme: "dark",
      pageBackground: "rgb(12, 15, 19)",
      textColor: "rgb(243, 246, 248)",
      themeColor: "#0c0f13",
    });
  });

  test("reports session-only purchase and clock changes when storage fails", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new Error("blocked for test");
      };
    });
    await page.reload();
    await openVehicleByLot(page, "A-0036");
    const auction = page.getByRole("region", { name: "Auction" });

    await auction
      .getByRole("button", { name: "Buy It Now", exact: true })
      .click();
    await auction
      .getByRole("dialog", { name: "Confirm Buy It Now" })
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    await expect(auction).toContainText(
      "confirmed at CA$14,000 for this session. Device storage is unavailable",
    );
    await page.getByRole("link", { name: "Back to inventory" }).click();

    const controls = await openDemoControls(page);
    await controls.getByRole("button", { name: "Start time" }).click();
    await expect(controls.getByRole("status")).toContainText(
      "Device storage is unavailable, so this change may be lost when you refresh.",
    );
  });
});

test.describe("mobile layout", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("keeps inventory and detail content within the viewport", async ({ page }) => {
    await resetApplication(page);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);

    await openVehicleByLot(page, "A-0036");
    const gallery = page.getByRole("region", { name: "Vehicle photos" });
    const auction = page.getByRole("region", { name: "Auction" });
    const galleryBox = await gallery.boundingBox();
    const auctionBox = await auction.boundingBox();

    expect(galleryBox).not.toBeNull();
    expect(auctionBox).not.toBeNull();
    expect((auctionBox?.y ?? 0) > (galleryBox?.y ?? 0)).toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
  });
});
