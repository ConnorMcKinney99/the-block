import {
  expect,
  openDemoControls,
  openVehicleByLot,
  resetApplication,
  setPausedDemoTime,
  submitMaximum,
  test,
} from "./support/app";

async function installSessionClock(
  page: import("@playwright/test").Page,
  initialNowMs: number,
) {
  await page.addInitScript((nowMs) => {
    if (window.sessionStorage.getItem("the-block:test-now") === null) {
      window.sessionStorage.setItem("the-block:test-now", String(nowMs));
    }
    Date.now = () =>
      Number(window.sessionStorage.getItem("the-block:test-now") ?? nowMs);
  }, initialNowMs);
}

async function advanceSessionClock(
  page: import("@playwright/test").Page,
  deltaMs: number,
) {
  await page.evaluate((delta) => {
    const key = "the-block:test-now";
    const current = Number(window.sessionStorage.getItem(key) ?? "0");
    window.sessionStorage.setItem(key, String(current + delta));
    document.dispatchEvent(new Event("visibilitychange"));
  }, deltaMs);
}

test.describe("demo lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await resetApplication(page);
  });

  test("keeps the hidden controls accessible and returns focus on Escape", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: "Open demo controls" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.focus();
    await trigger.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("button", { name: "Close" }),
    ).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("complementary", { name: "Demo controls" }),
    ).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await openVehicleByLot(page, "A-0036");
    await expect(trigger).toHaveCount(0);
  });

  test("starts, hydrates, pauses, resumes, and resets one persisted clock", async ({
    page,
  }) => {
    await installSessionClock(page, 10_000_000);
    await page.reload();
    await page.goto("/?q=A-0036");
    let controls = await openDemoControls(page);

    await expect(controls).toContainText("00:00");
    await expect(controls).toContainText("Paused");
    await controls.getByRole("button", { name: "Start time" }).click();
    await expect(controls).toContainText("Running");

    await advanceSessionClock(page, 30_000);
    await expect(controls).toContainText("00:30");
    await page.reload();
    controls = await openDemoControls(page);
    await expect(controls).toContainText("00:30");
    await expect(controls).toContainText("Running");

    await controls.getByRole("button", { name: "Pause time" }).click();
    await advanceSessionClock(page, 15_000);
    await expect(controls).toContainText("00:30");
    await expect(controls).toContainText("Paused");
    await page.reload();
    controls = await openDemoControls(page);
    await expect(controls).toContainText("00:30");

    await controls.getByRole("button", { name: "Resume time" }).click();
    await advanceSessionClock(page, 15_000);
    await expect(controls).toContainText("00:45");
    await controls.getByRole("button", { name: "Reset time" }).click();
    await expect(controls).toContainText("00:00");
    await expect(controls).toContainText("Paused");
  });

  test("settles A-0036 as a buyer win and time reset reopens it with bids", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");
    await submitMaximum(page, "13500");
    await page.getByRole("link", { name: "Back to inventory" }).click();

    await setPausedDemoTime(page, 6 * 60_000);
    await page.reload();
    let card = page.getByRole("article");
    await expect(card).toContainText("Ended · You won");
    await expect(card).toContainText("CA$12,500");
    await expect(card).toContainText("18 bids");

    await card.getByRole("link", { name: /View 2016 Jeep Wrangler/ }).click();
    let auction = page.getByRole("region", { name: "Auction" });
    await expect(auction).toContainText("You won this auction.");
    await expect(auction).toContainText("Winning bid CA$12,500.");
    await expect(auction).toContainText("Your maximum");
    await expect(auction).toContainText("18 bids");
    await page.getByRole("link", { name: "Back to inventory" }).click();

    const controls = await openDemoControls(page);
    await controls.getByRole("button", { name: "Reset time" }).click();
    card = page.getByRole("article");
    await expect(card).toContainText("Paused · Ends in 6m 0s");
    await expect(card).toContainText("You’re leading");
    await expect(card).toContainText("CA$12,500");
    await expect(card).toContainText("18 bids");
    await controls.getByRole("button", { name: "Close" }).click();

    await card.getByRole("link", { name: /View 2016 Jeep Wrangler/ }).click();
    auction = page.getByRole("region", { name: "Auction" });
    await expect(
      auction.getByRole("spinbutton", { name: "Maximum bid" }),
    ).toHaveAttribute("min", "13501");
  });

  test("defers saved activity when time reset rewinds before auction start", async ({
    page,
  }) => {
    await setPausedDemoTime(page, 16 * 60_000);
    await page.reload();
    await openVehicleByLot(page, "A-0006");
    await submitMaximum(page, "10500");
    await page.getByRole("link", { name: "Back to inventory" }).click();

    const controls = await openDemoControls(page);
    await controls.getByRole("button", { name: "Reset time" }).click();
    const card = page.getByRole("article");
    await expect(card).toContainText("Paused · Starts in 16m 0s");
    await expect(card).toContainText("Starting bid");
    await expect(card).toContainText("0 bids");
    await expect(card).toContainText("Saved maximum resumes at start");
    await controls.getByRole("button", { name: "Close" }).click();

    await card.getByRole("link", { name: /lot A-0006/ }).click();
    const auction = page.getByRole("region", { name: "Auction" });
    await expect(auction).toContainText("Your saved maximum");
    await expect(auction).toContainText("CA$10,500");
    await expect(auction).toContainText(
      "Bidding is unavailable until this auction starts.",
    );
  });

  test("resets auction data independently from demo time", async ({ page }) => {
    await setPausedDemoTime(page, 30_000);
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
    await page.getByRole("link", { name: "Back to inventory" }).click();

    const card = page.getByRole("article");
    const clockBefore = await page.evaluate(() =>
      window.localStorage.getItem("the-block:demo-clock"),
    );
    const controls = await openDemoControls(page);
    const resetButton = controls.getByRole("button", {
      name: "Reset all auction data",
    });
    await expect(controls).toContainText("00:30");
    await resetButton.click();
    await controls.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(resetButton).toBeFocused();
    await expect(card).toContainText("Bought with Buy It Now");

    await resetButton.click();
    await controls.getByRole("button", { name: "Confirm auction reset" }).click();
    await expect(resetButton).toBeFocused();
    await expect(controls).toContainText("00:30");
    await expect(card).toContainText("CA$12,000");
    await expect(card).toContainText("17 bids");
    await expect(card).not.toContainText("Bought with Buy It Now");
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("the-block:auction-overlays"),
        ),
      )
      .toBeNull();
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem("the-block:demo-clock"),
      ),
    ).toBe(clockBefore);
  });

  test("closes reserve-met C-0040 at its deadline", async ({ page }) => {
    await setPausedDemoTime(page, 10 * 60_000);
    await page.reload();
    await openVehicleByLot(page, "C-0040");
    const auction = page.getByRole("region", { name: "Auction" });

    await expect(auction).toContainText("Sold to another bidder.");
    await expect(auction).toContainText("Reserve met");
    await expect(auction).toContainText("Final bid");
    await expect(auction).toContainText("CA$20,000");
    await expect(
      auction.getByRole("spinbutton", { name: "Maximum bid" }),
    ).toHaveCount(0);
  });
});
