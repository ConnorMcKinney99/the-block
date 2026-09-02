import { expect, resetApplication, test } from "./support/app";

test.describe("inventory", () => {
  test.beforeEach(async ({ page }) => {
    await resetApplication(page);
  });

  test("renders the complete result count and incrementally loads near the viewport", async ({
    page,
  }) => {
    const inventory = page.getByLabel("Vehicle inventory");
    const cards = inventory.getByRole("article");

    await expect(
      page.getByRole("heading", { level: 1, name: "Auction inventory" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "200 vehicles in inventory",
    );
    await expect(cards).toHaveCount(24);
    await expect(page.getByText("Showing 24 of 200 vehicles.")).toBeVisible();

    await page
      .getByRole("button", { name: "Load 24 more vehicles" })
      .scrollIntoViewIfNeeded();

    await expect(cards).toHaveCount(48);
    await expect(page.getByText("Lot A-0048", { exact: true })).toBeVisible();
  });

  test("keeps filters on the left and controls above the scrolling results", async ({
    page,
  }) => {
    const controls = page.getByRole("region", { name: "Inventory controls" });
    const filters = page.getByRole("complementary", {
      name: "Inventory filters",
    });
    const cards = page.getByLabel("Vehicle inventory").getByRole("article");

    await expect(filters.getByRole("combobox", { name: "Year" })).toBeVisible();
    await expect(filters.locator("summary")).toHaveCount(0);
    await cards.nth(18).scrollIntoViewIfNeeded();

    await expect(
      controls.getByRole("searchbox", { name: "Search inventory" }),
    ).toBeVisible();
    await expect(
      controls.getByRole("combobox", { name: "Sort inventory" }),
    ).toBeVisible();

    const searchBox = await controls
      .getByRole("searchbox", { name: "Search inventory" })
      .boundingBox();
    const sortBox = await controls
      .getByRole("combobox", { name: "Sort inventory" })
      .boundingBox();

    expect(searchBox).not.toBeNull();
    expect(sortBox).not.toBeNull();
    expect(Math.abs((searchBox?.y ?? 0) - (sortBox?.y ?? 0))).toBeLessThan(1);
    expect(
      Math.abs((searchBox?.height ?? 0) - (sortBox?.height ?? 0)),
    ).toBeLessThan(1);

    const headerBottom = await page
      .getByRole("banner")
      .evaluate((header) => header.getBoundingClientRect().bottom);
    const controlsTop = await controls.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    const filtersTop = await filters.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    const filtersRight = await filters.evaluate(
      (element) => element.getBoundingClientRect().right,
    );
    const resultsLeft = await page
      .getByLabel("Vehicle inventory")
      .evaluate((element) => element.getBoundingClientRect().left);

    expect(controlsTop).toBeGreaterThanOrEqual(headerBottom - 1);
    expect(controlsTop).toBeLessThanOrEqual(headerBottom + 1);
    expect(filtersTop).toBeGreaterThanOrEqual(headerBottom);
    expect(filtersRight).toBeLessThan(resultsLeft);
  });

  test("keeps a keyboard fallback and focuses completion after the final batch", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "IntersectionObserver", {
        configurable: true,
        value: undefined,
      });
    });
    await page.reload();

    const cards = page
      .getByLabel("Vehicle inventory")
      .getByRole("article");

    while (await page.getByRole("button", { name: /Load \d+ more/ }).count()) {
      await page.getByRole("button", { name: /Load \d+ more/ }).click();
    }

    await expect(cards).toHaveCount(200);
    const completion = page.getByText("All 200 matching vehicles loaded.");
    await expect(completion).toBeFocused();
  });

  test("searches case-insensitively, opens details, and preserves criteria on return", async ({
    page,
  }) => {
    const search = page.getByRole("searchbox", { name: "Search inventory" });
    await search.fill("a-0036");

    await expect(page.getByRole("status")).toContainText(
      "1 vehicle matching “a-0036”",
    );
    const card = page.getByRole("article");
    await expect(card).toContainText("Lot A-0036");
    await expect(card).toContainText("Current bid");
    await expect(card).toContainText("CA$12,000");
    await expect(card).toContainText("17 bids");
    await expect(card).toContainText("Reserve met");
    await expect(card).toContainText("Clean title");
    const preview = card.locator("figure");
    await expect(preview).toContainText("Current bid");
    await expect(preview).toContainText("CA$12,000");
    const cleanTitle = preview.getByText("Clean title", { exact: true });
    await expect(cleanTitle).toHaveAttribute("data-status", "clean");
    await expect(cleanTitle).toHaveCSS("background-color", "rgb(23, 54, 40)");
    await expect(cleanTitle).toHaveCSS("color", "rgb(123, 217, 160)");
    const grade = card.getByRole("meter", {
      name: "Condition grade for 2016 Jeep Wrangler",
    });
    await expect(grade).toHaveAttribute("aria-valuenow", "2");
    await expect(grade).toHaveAttribute(
      "aria-valuetext",
      "2.0 out of 5 stars",
    );
    await expect(grade).not.toContainText("2.0/5");

    await card.click();
    await expect(
      page.getByRole("heading", { level: 1, name: "2016 Jeep Wrangler" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to inventory" }).click();

    await expect(search).toHaveValue("a-0036");
    await expect(page).toHaveURL(/\?q=a-0036$/);
  });

  test("shows a useful empty state and resets contradictory criteria", async ({
    page,
  }) => {
    await page.goto("/?q=A-0036&province=Quebec");

    await expect(
      page.getByRole("heading", { name: "No vehicles found" }),
    ).toBeVisible();
    await expect(page.getByText(/with the selected filters/)).toContainText(
      "A-0036",
    );

    await page.getByRole("button", { name: "View all vehicles" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("status")).toContainText(
      "200 vehicles in inventory",
    );
  });

  test("refines model choices by make and groups lots by series", async ({
    page,
  }) => {
    const make = page.getByRole("combobox", { name: "Make" });
    const model = page.getByRole("combobox", { name: "Model" });
    const lot = page.getByRole("combobox", { name: "Lot series" });

    await expect(model).toBeDisabled();
    await make.selectOption("BMW");
    await expect(model).toBeEnabled();
    await expect(model.locator("option")).toHaveText([
      "All models",
      "3 Series",
      "5 Series",
      "X3",
      "X5",
    ]);

    await model.selectOption("X3");
    await expect(page.getByRole("status")).toContainText(
      "2 vehicles matching 2 filters",
    );
    await make.selectOption("Jeep");
    await expect(model).toHaveValue("");
    await expect(model.locator("option")).toHaveText([
      "All models",
      "Grand Cherokee",
      "Wrangler",
    ]);
    await expect(page).toHaveURL(/make=Jeep/);
    await expect(page).not.toHaveURL(/model=/);

    await lot.selectOption("A");
    await expect(page.getByRole("status")).toContainText(
      "4 vehicles matching 2 filters",
    );
    await expect(
      page.getByRole("article").first().getByText(/^Lot A-/),
    ).toBeVisible();
  });

  test("refines cities by province and dealerships by province and city", async ({
    page,
  }) => {
    const filters = page.getByRole("complementary", {
      name: "Inventory filters",
    });
    const province = filters.getByRole("combobox", { name: "Province" });
    const city = filters.getByRole("combobox", { name: "City" });
    const dealership = filters.getByRole("combobox", {
      name: "Dealership",
    });

    expect(
      await filters
        .locator("select")
        .evaluateAll((selects) => selects.map((select) => select.id)),
    ).toEqual([
      "inventory-filter-year",
      "inventory-filter-make",
      "inventory-filter-model",
      "inventory-filter-lot",
      "inventory-filter-province",
      "inventory-filter-city",
      "inventory-filter-dealership",
    ]);
    await expect(city).toBeDisabled();
    await expect(city.locator("option")).toHaveText([
      "Select a province first",
    ]);
    await expect(dealership).toBeDisabled();
    await expect(dealership.locator("option")).toHaveText([
      "Select a province and city first",
    ]);

    await province.selectOption("Ontario");
    await expect(city).toBeEnabled();
    await expect(city.locator("option")).toHaveText([
      "All cities",
      "Barrie",
      "Brampton",
      "Hamilton",
      "Kitchener",
      "London",
      "Markham",
      "Mississauga",
      "Ottawa",
      "Toronto",
      "Vaughan",
      "Windsor",
    ]);
    await expect(dealership).toBeDisabled();
    await expect(dealership.locator("option")).toHaveText([
      "Select a city first",
    ]);

    await city.selectOption("Vaughan");
    await expect(dealership).toBeEnabled();
    await expect(dealership.locator("option")).toHaveText([
      "All dealerships",
      "AutoPark Toronto",
      "Capital City Auto",
      "Golden Horseshoe Motors",
      "Grand Touring Motors",
      "King City Auto",
      "Maple Motors",
      "Northland Chrysler",
    ]);

    await dealership.selectOption("Northland Chrysler");
    await expect(page.getByRole("status")).toContainText(
      "2 vehicles matching 3 filters",
    );
    await expect(page.getByText("Lot A-0036", { exact: true })).toBeVisible();
    await expect(page.getByText("Lot C-0048", { exact: true })).toBeVisible();

    await city.selectOption("Toronto");
    await expect(dealership).toHaveValue("");
    await expect(dealership.locator("option")).toHaveText([
      "All dealerships",
      "Capital City Auto",
      "Grand Touring Motors",
      "King City Auto",
      "Lakeshore Auto Group",
      "Northland Chrysler",
    ]);
    await expect(page).not.toHaveURL(/[?&]dealership=/);

    await province.selectOption("Quebec");
    await expect(city).toHaveValue("");
    await expect(city.locator("option")).toHaveText([
      "All cities",
      "Gatineau",
      "Laval",
      "Longueuil",
      "Montreal",
      "Quebec City",
      "Sherbrooke",
    ]);
    await expect(dealership).toBeDisabled();
    await expect(page).not.toHaveURL(/[?&]city=/);
    await expect(page).not.toHaveURL(/[?&]dealership=/);
  });

  test("canonicalizes dependent location deep links", async ({ page }) => {
    const province = page.getByRole("combobox", { name: "Province" });
    const city = page.getByRole("combobox", { name: "City" });
    const dealership = page.getByRole("combobox", { name: "Dealership" });

    await page.goto(
      "/?province=ontario&city=vaughan&dealership=northland%20chrysler",
    );
    await expect(province).toHaveValue("Ontario");
    await expect(city).toHaveValue("Vaughan");
    await expect(dealership).toHaveValue("Northland Chrysler");
    await expect(page).toHaveURL(/province=Ontario/);
    await expect(page).toHaveURL(/city=Vaughan/);
    await expect(page).toHaveURL(/dealership=Northland/);

    await page.goto(
      "/?province=Ontario&city=Montreal&dealership=Rive-Sud%20Motors",
    );
    await expect(page).toHaveURL("/?province=Ontario");
    await expect(city).toHaveValue("");
    await expect(dealership).toHaveValue("");

    await page.goto("/?city=Vaughan&dealership=Northland%20Chrysler");
    await expect(page).toHaveURL("/");
    await expect(city).toBeDisabled();
    await expect(dealership).toBeDisabled();
  });

  test("uses an inclusive price slider and reports reversed deep links", async ({
    page,
  }) => {
    const minimum = page.getByRole("slider", { name: "Minimum price" });
    const maximum = page.getByRole("slider", { name: "Maximum price" });

    await minimum.fill("12000");
    await maximum.fill("20000");
    await expect(page.getByRole("status")).toContainText(
      "61 vehicles matching 1 filter",
    );
    await expect(page).toHaveURL(/minPrice=12000/);
    await expect(page).toHaveURL(/maxPrice=20000/);

    await page.goto("/?minPrice=20000&maxPrice=12000");
    await expect(page.getByRole("alert")).toHaveText(
      "Minimum price must be less than or equal to maximum price.",
    );
    await expect(
      page.getByRole("heading", { name: "No vehicles found" }),
    ).toBeVisible();
    await expect(page.getByText(/Adjust the price range/)).toBeVisible();
  });

  test("sorts the full result set and canonicalizes retired URL state", async ({
    page,
  }) => {
    await page.goto(
      "/?page=999&page=2&minPrice=-1&maxPrice=1.5&sort=unsupported&trim=Sahara&vin=ignored",
    );
    await expect(page).toHaveURL("/");

    const sort = page.getByRole("combobox", { name: "Sort inventory" });
    const cards = page.getByRole("article");
    await sort.selectOption("price-asc");
    await expect(cards.nth(0)).toContainText("Lot D-0010");
    await expect(cards.nth(1)).toContainText("Lot D-0018");
    await expect(cards.nth(0)).toContainText("CA$2,500");

    await sort.selectOption("price-desc");
    await expect(cards.nth(0)).toContainText("Lot C-0007");
    await expect(cards.nth(0)).toContainText("CA$77,000");

    await sort.selectOption("ending-soon");
    await expect(cards.nth(0)).toContainText("Lot A-0031");
    await expect(page.getByRole("status")).toContainText(
      "Sorted by ending soon.",
    );
  });
});
