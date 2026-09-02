import {
  expect,
  openVehicleByLot,
  resetApplication,
  setPausedDemoTime,
  submitMaximum,
  test,
} from "./support/app";

test.describe("My Bids", () => {
  test.beforeEach(async ({ page }) => {
    await resetApplication(page);
  });

  test("provides primary navigation and a useful empty state", async ({
    page,
  }) => {
    const navigation = page.getByRole("navigation", {
      name: "Primary navigation",
    });
    const myBidsLink = navigation.getByRole("link", { name: "My Bids" });

    await myBidsLink.click();

    await expect(page).toHaveURL("/my-bids");
    await expect(myBidsLink).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", { level: 1, name: "My Bids" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No bids yet" }),
    ).toBeVisible();
    await expect(page.getByLabel("Bid summary")).toContainText("Active0");
    await expect(
      page.getByRole("link", { name: "Browse auction inventory" }),
    ).toHaveAttribute("href", "/");
  });

  test("shows an active bid and returns to My Bids from vehicle details", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");
    await submitMaximum(page, "13500");
    await page.getByRole("link", { name: "My Bids" }).click();

    const activeBids = page.getByRole("region", { name: "Active bids" });
    await expect(activeBids.getByText("Lot A-0036", { exact: true })).toBeVisible();
    await expect(activeBids).toContainText("You’re leading");
    await expect(activeBids).not.toContainText("CA$13,500");

    await activeBids
      .getByRole("link", { name: /View 2016 Jeep Wrangler.*lot A-0036/ })
      .click();
    await page.getByRole("link", { name: "Back to My Bids" }).click();

    await expect(page).toHaveURL("/my-bids");
    await expect(
      page.getByRole("region", { name: "Active bids" }),
    ).toContainText("Lot A-0036");
  });

  test("separates auction wins from other closed bid activity", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");
    await submitMaximum(page, "13500");
    await openVehicleByLot(page, "A-0031");
    await submitMaximum(page, "15000");
    await page.getByRole("link", { name: "My Bids" }).click();

    await expect(page.getByLabel("Active bids vehicles").getByRole("article")).toHaveCount(2);

    await setPausedDemoTime(page, 6 * 60_000);
    await page.reload();

    const won = page.getByRole("region", { name: "Won" });
    const pastBids = page.getByRole("region", { name: "Past bids" });
    await expect(
      page.getByRole("region", { name: "Active bids" }),
    ).toContainText("You have no upcoming or open bids.");
    await expect(won).toContainText("Lot A-0036");
    await expect(won).toContainText("Ended · You won");
    await expect(pastBids).toContainText("Lot A-0031");
    await expect(pastBids).toContainText("Reserve not met");
  });

  test("shows a Buy It Now-only purchase on My Bids", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");
    const auction = page.getByRole("region", { name: "Auction" });
    await auction
      .getByRole("button", { name: "Buy It Now", exact: true })
      .click();
    await auction
      .getByRole("dialog", { name: "Confirm Buy It Now" })
      .getByRole("button", { name: "Confirm", exact: true })
      .click();
    await page.getByRole("link", { name: "My Bids" }).click();

    const won = page.getByRole("region", { name: "Won" });
    await expect(page.getByLabel("Bid summary")).toContainText("Won1");
    await expect(won).toContainText("Lot A-0036");
    await expect(won).toContainText("Bought with Buy It Now");
    await expect(won).toContainText("Purchase price");
  });
});
