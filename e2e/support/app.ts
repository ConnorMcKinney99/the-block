import {
  expect,
  test as base,
  type Page,
} from "@playwright/test";

const placeholderImage = `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="#e6e9ed" />
  </svg>
`;

export const test = base.extend({
  page: async ({ page }, use) => {
    const runtimeErrors: string[] = [];

    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        runtimeErrors.push(message.text());
      }
    });

    await page.route("https://placehold.co/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: placeholderImage,
      });
    });

    await use(page);

    expect(runtimeErrors, "unexpected browser runtime errors").toEqual([]);
  },
});

export { expect };

export async function resetApplication(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

export async function openVehicleByLot(
  page: Page,
  lot: string,
): Promise<void> {
  await page.goto(`/?q=${encodeURIComponent(lot)}`);
  await page
    .getByRole("link", { name: new RegExp(`View .* lot ${lot}$`) })
    .click();
  await expect(page.getByText(`Lot ${lot}`, { exact: true })).toBeVisible();
}

export async function submitMaximum(
  page: Page,
  amount: string,
): Promise<void> {
  const auction = page.getByRole("region", { name: "Auction" });
  const input = auction.getByRole("spinbutton", { name: "Maximum bid" });

  await input.fill(amount);
  await auction.getByRole("button", { name: "Bid", exact: true }).click();
  await auction
    .getByRole("dialog", { name: "Confirm maximum bid" })
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
}

export async function setPausedDemoTime(
  page: Page,
  elapsedMs: number,
): Promise<void> {
  await page.evaluate((elapsed) => {
    window.localStorage.setItem(
      "the-block:demo-clock",
      JSON.stringify({
        version: 1,
        clock: { status: "paused", elapsedMs: elapsed },
      }),
    );
  }, elapsedMs);
}

export async function openDemoControls(page: Page) {
  await page.getByRole("button", { name: "Open demo controls" }).click();
  return page.getByRole("complementary", { name: "Demo controls" });
}
