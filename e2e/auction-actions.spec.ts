import {
  expect,
  openVehicleByLot,
  resetApplication,
  submitMaximum,
  test,
} from "./support/app";

async function installControllableNow(
  page: import("@playwright/test").Page,
  initialNowMs: number,
) {
  await page.addInitScript((nowMs) => {
    const testWindow = window as Window & { __theBlockNowMs?: number };
    testWindow.__theBlockNowMs = nowMs;
    Date.now = () => testWindow.__theBlockNowMs ?? nowMs;
  }, initialNowMs);
}

async function moveControllableNow(
  page: import("@playwright/test").Page,
  deltaMs: number,
) {
  await page.evaluate((delta) => {
    const testWindow = window as Window & { __theBlockNowMs?: number };
    testWindow.__theBlockNowMs = (testWindow.__theBlockNowMs ?? 0) + delta;
  }, deltaMs);
}

async function seedRunningClockNearA0036Close(
  page: import("@playwright/test").Page,
  nowMs: number,
) {
  await page.goto("/");
  await page.evaluate((anchor) => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "the-block:demo-clock",
      JSON.stringify({
        version: 1,
        clock: {
          status: "running",
          elapsedMs: 6 * 60_000 - 1_000,
          resumedAtEpochMs: anchor,
        },
      }),
    );
  }, nowMs);
}

test.describe("buyer auction actions", () => {
  test.beforeEach(async ({ page }) => {
    await resetApplication(page);
  });

  test("runs the A-0036 proxy regression through card, detail, and refresh", async ({
    page,
  }) => {
    await page.goto("/?q=A-0036");
    let card = page.getByRole("article");
    await expect(card).toContainText("CA$12,000");
    await expect(card).toContainText("17 bids");
    await expect(card).toContainText("Reserve met");

    await card
      .getByRole("link", { name: /View 2016 Jeep Wrangler.*lot A-0036/ })
      .click();
    const auction = page.getByRole("region", { name: "Auction" });
    await expect(
      auction.getByRole("spinbutton", { name: "Maximum bid" }),
    ).toHaveAttribute("min", "12500");

    await submitMaximum(page, "13500");

    await expect(auction.getByRole("status")).toContainText(
      "Maximum CA$13,500 saved on this device. You’re currently leading at CA$12,500.",
    );
    await expect(auction).toContainText("Current bid");
    await expect(auction).toContainText("CA$12,500");
    await expect(auction).toContainText("18 bids");
    await expect(auction).toContainText("Reserve met");
    await expect(auction).toContainText("Your maximum");
    await expect(auction).toContainText("CA$13,500");
    await expect(
      auction.getByRole("button", { name: "Bid", exact: true }),
    ).toBeEnabled();

    await page.getByRole("link", { name: "Back to inventory" }).click();
    card = page.getByRole("article");
    await expect(card).toContainText("CA$12,500");
    await expect(card).toContainText("18 bids");
    await expect(card).toContainText("You’re leading");
    await expect(card).not.toContainText("CA$13,500");

    await page.reload();
    card = page.getByRole("article");
    await expect(card).toContainText("CA$12,500");
    await expect(card).toContainText("18 bids");
    await expect(card).toContainText("You’re leading");
  });

  test("validates, confirms, cancels, and raises a private leader maximum", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");
    const auction = page.getByRole("region", { name: "Auction" });
    const input = auction.getByRole("spinbutton", { name: "Maximum bid" });

    await input.fill("12499");
    await auction.getByRole("button", { name: "Bid", exact: true }).click();
    await expect(auction.getByRole("alert")).toHaveText(
      "Enter at least CA$12,500.",
    );
    await expect(input).toHaveAttribute("aria-invalid", "true");

    await input.fill("13500");
    await auction.getByRole("button", { name: "Bid", exact: true }).click();
    const confirmation = auction.getByRole("dialog", {
      name: "Confirm maximum bid",
    });
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("Your maximumCA$13,500");
    await confirmation
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("13500");
    await expect(auction).toContainText("CA$12,000");

    await submitMaximum(page, "13500");
    await submitMaximum(page, "13501");
    await expect(auction.getByRole("status")).toContainText(
      "Maximum CA$13,501 saved on this device.",
    );
    await expect(auction).toContainText("CA$12,500");
    await expect(auction).toContainText("18 bids");
    await expect(auction).toContainText("CA$13,501");
  });

  test("keeps reserve-met C-0040 bidable", async ({ page }) => {
    await openVehicleByLot(page, "C-0040");
    const auction = page.getByRole("region", { name: "Auction" });
    const input = auction.getByRole("spinbutton", { name: "Maximum bid" });

    await expect(auction).toContainText("Reserve met");
    await expect(input).toHaveAttribute("min", "20500");
    await submitMaximum(page, "20500");
    await expect(auction).toContainText("CA$20,500");
    await expect(auction).toContainText("2 bids");
    await expect(auction).toContainText("Reserve met");
    await expect(
      auction.getByRole("button", { name: "Bid", exact: true }),
    ).toBeEnabled();
  });

  test("makes maximum and Buy It Now confirmations exclusive without losing input", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");
    const auction = page.getByRole("region", { name: "Auction" });
    const input = auction.getByRole("spinbutton", { name: "Maximum bid" });
    await input.fill("13500");

    const buyNowButton = auction.getByRole("button", {
      name: "Buy It Now",
      exact: true,
    });
    await buyNowButton.click();
    await expect(
      auction.getByRole("dialog", { name: "Confirm Buy It Now" }),
    ).toBeVisible();
    await expect(input).toHaveCount(0);
    await auction.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(buyNowButton).toBeFocused();
    await expect(input).toHaveValue("13500");

    await auction.getByRole("button", { name: "Bid", exact: true }).click();
    await expect(
      auction.getByRole("dialog", { name: "Confirm maximum bid" }),
    ).toBeVisible();
    await expect(
      auction.getByRole("button", { name: "Buy It Now", exact: true }),
    ).toHaveCount(0);
    await auction.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(input).toHaveValue("13500");
  });

  test("persists Buy It Now while preserving prior proxy state", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");
    let auction = page.getByRole("region", { name: "Auction" });
    await submitMaximum(page, "13500");

    await auction
      .getByRole("button", { name: "Buy It Now", exact: true })
      .click();
    await auction
      .getByRole("dialog", { name: "Confirm Buy It Now" })
      .getByRole("button", { name: "Confirm", exact: true })
      .click();

    await expect(auction).toContainText("Buy It Now confirmed.");
    await expect(auction).toContainText("Purchase price");
    await expect(auction).toContainText("CA$14,000");
    await expect(auction).toContainText("Current bid before purchase");
    await expect(auction).toContainText("CA$12,500");
    await expect(auction).toContainText("18 bids");
    await expect(auction).toContainText("CA$13,500");
    await expect(auction).toContainText("Reserve met");
    await expect(
      auction.getByRole("spinbutton", { name: "Maximum bid" }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "Back to inventory" }).click();
    const card = page.getByRole("article");
    await expect(card).toContainText("Purchase price");
    await expect(card).toContainText("CA$14,000");
    await expect(card).toContainText("Bought with Buy It Now");

    await card.getByRole("link", { name: /View 2016 Jeep Wrangler/ }).click();
    await page.reload();
    auction = page.getByRole("region", { name: "Auction" });
    await expect(auction).toContainText("Buy It Now confirmed.");
    await expect(auction).toContainText("CA$14,000");
    await expect(auction).toContainText("18 bids");
  });

  test("uses the fixed price to clear reserve on a no-bid vehicle", async ({
    page,
  }) => {
    await openVehicleByLot(page, "D-0040");
    const auction = page.getByRole("region", { name: "Auction" });
    await expect(auction).toContainText("Reserve not met");
    await expect(auction).toContainText("0 bids");

    await auction
      .getByRole("button", { name: "Buy It Now", exact: true })
      .click();
    await auction
      .getByRole("dialog", { name: "Confirm Buy It Now" })
      .getByRole("button", { name: "Confirm", exact: true })
      .click();

    await expect(auction).toContainText("Buy It Now confirmed.");
    await expect(auction).toContainText("Reserve met");
    await expect(auction).toContainText("Purchase price");
    await expect(auction).toContainText("CA$18,000");
    await expect(auction).toContainText("Starting bid before purchase");
    await expect(auction).toContainText("CA$8,000");
    await expect(auction).toContainText("0 bids");
  });

  test("reports session-only bidding when local storage writes fail", async ({
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

    await submitMaximum(page, "13500");
    await expect(auction.getByRole("status")).toContainText(
      "applied for this session. Device storage is unavailable",
    );
    await expect(auction.getByRole("status")).not.toContainText(
      "saved on this device",
    );
    await expect(auction).toContainText("CA$12,500");
    await expect(auction).toContainText("18 bids");
  });

  test("rejects a confirmed maximum exactly at closure", async ({ page }) => {
    const nowMs = 5_000_000;
    await installControllableNow(page, nowMs);
    await seedRunningClockNearA0036Close(page, nowMs);
    await openVehicleByLot(page, "A-0036");
    const auction = page.getByRole("region", { name: "Auction" });
    const input = auction.getByRole("spinbutton", { name: "Maximum bid" });

    await input.fill("13500");
    await auction.getByRole("button", { name: "Bid", exact: true }).click();
    await moveControllableNow(page, 1_000);
    await auction
      .getByRole("dialog", { name: "Confirm maximum bid" })
      .getByRole("button", { name: "Confirm", exact: true })
      .click();

    await expect(auction.getByRole("status")).toContainText(
      "Sold to another bidder.",
    );
    await expect(auction).toContainText("Final bid");
    await expect(auction).toContainText("CA$12,000");
    await expect(auction).toContainText("17 bids");
    await expect(auction).not.toContainText("Your maximum");
  });

  test("rejects a confirmed Buy It Now exactly at closure", async ({ page }) => {
    const nowMs = 7_000_000;
    await installControllableNow(page, nowMs);
    await seedRunningClockNearA0036Close(page, nowMs);
    await openVehicleByLot(page, "A-0036");
    const auction = page.getByRole("region", { name: "Auction" });

    await auction
      .getByRole("button", { name: "Buy It Now", exact: true })
      .click();
    await moveControllableNow(page, 1_000);
    await auction
      .getByRole("dialog", { name: "Confirm Buy It Now" })
      .getByRole("button", { name: "Confirm", exact: true })
      .click();

    await expect(auction).toContainText("Sold to another bidder.");
    await expect(auction).toContainText(
      "This auction has ended. Buy It Now was not applied.",
    );
    await expect(auction).toContainText("CA$12,000");
    await expect(auction).toContainText("17 bids");
  });
});
