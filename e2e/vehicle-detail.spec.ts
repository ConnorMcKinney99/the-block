import {
  expect,
  openVehicleByLot,
  resetApplication,
  test,
} from "./support/app";

test.describe("vehicle details", () => {
  test.beforeEach(async ({ page }) => {
    await resetApplication(page);
  });

  test("shows the gallery, specifications, condition stars, seller, and auction", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0036");

    await expect(
      page.getByRole("heading", { level: 1, name: "2016 Jeep Wrangler" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Condition", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Condition & title", exact: true }),
    ).toHaveCount(0);
    const grade = page.getByRole("meter", { name: "Condition grade" });
    await expect(grade).toHaveAttribute("aria-valuemin", "0");
    await expect(grade).toHaveAttribute("aria-valuemax", "5");
    await expect(grade).toHaveAttribute("aria-valuenow", "2");
    await expect(grade).toHaveAttribute(
      "aria-valuetext",
      "2.0 out of 5 stars",
    );
    await expect(grade).toContainText("2.0/5");
    await expect(page.getByText("Clean title")).toBeVisible();
    await expect(page.getByText("Northland Chrysler")).toBeVisible();

    const auction = page.getByRole("region", { name: "Auction" });
    await expect(auction).toContainText("Current bid");
    await expect(auction).toContainText("CA$12,000");
    await expect(auction).toContainText("17 bids");
    await expect(auction).toContainText("Reserve met");

    await expect(
      page.getByRole("img", {
        name: /2016 Jeep Wrangler, supplied photo 1 of 4/,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "View photo 2 of 4 for 2016 Jeep Wrangler",
      })
      .click();
    await expect(
      page.getByRole("img", {
        name: /2016 Jeep Wrangler, supplied photo 2 of 4/,
      }),
    ).toBeVisible();
  });

  test("distinguishes starting bid and no-reserve inventory", async ({ page }) => {
    await openVehicleByLot(page, "A-0011");
    const auction = page.getByRole("region", { name: "Auction" });

    await expect(auction).toContainText("Starting bid");
    await expect(auction).toContainText("CA$15,000");
    await expect(auction).toContainText("0 bids");
    await expect(auction).toContainText("No reserve");
  });

  test("shows upcoming local start and end times without a duration", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0041");
    const auction = page.getByRole("region", { name: "Auction" });

    await expect(auction).toContainText("Auction starts in");
    await expect(auction).toContainText(
      "Bidding is unavailable until this auction starts.",
    );
    await expect(
      auction.getByRole("spinbutton", { name: "Maximum bid" }),
    ).toHaveCount(0);
    await expect(auction).not.toContainText("Duration");
    await expect(auction).not.toContainText(/normalized/i);
    await expect(auction).toContainText("Times are shown in your system time zone");

    const times = auction.locator("time");
    await expect(times).toHaveCount(2);
    const startTime = Date.parse((await times.nth(0).getAttribute("datetime")) ?? "");
    const endTime = Date.parse((await times.nth(1).getAttribute("datetime")) ?? "");
    expect(Number.isFinite(startTime)).toBe(true);
    expect(endTime - startTime).toBe(60 * 60 * 1_000);
  });

  test("keeps condition data explicit and never exposes the numeric reserve", async ({
    page,
  }) => {
    await openVehicleByLot(page, "A-0001");

    await expect(
      page.getByText("No damage noted in the supplied condition data."),
    ).toBeVisible();
    await expect(page.getByText("Reserve not met")).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("CA$29,000");

    await page.getByRole("link", { name: "Back to inventory" }).click();
    await openVehicleByLot(page, "C-0002");
    await expect(page.getByText("Clean title")).toBeVisible();
    await expect(page.getByText(/Salvage title\.$/)).toBeVisible();
  });
});
