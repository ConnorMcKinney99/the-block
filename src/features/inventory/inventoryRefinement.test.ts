import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import { findVehicleByLot } from "../../data/vehicles";
import type {
  AuctionLifecycle,
  SettledAuctionOutcome,
} from "../../domain/auction/auctionLifecycle";
import {
  getInventoryPriceDomain,
  getInventoryPriceRangeError,
  isInventoryPriceRangeActive,
  normalizeInventoryPriceRange,
  readInventoryPriceRange,
  readInventorySort,
  refineInventoryListings,
  type InventoryListing,
} from "./inventoryRefinement";

function listing(
  lot: string,
  displayedPrice: number,
  originalIndex: number,
  lifecycle: AuctionLifecycle = "open",
  endOffsetMs = 60_000,
): InventoryListing {
  const vehicle = findVehicleByLot(lot);

  if (vehicle === undefined) {
    throw new Error(`Missing inventory refinement fixture ${lot}.`);
  }

  const outcome: SettledAuctionOutcome | null =
    lifecycle === "closed" ? "no-bids" : null;

  return {
    vehicle,
    displayedPrice,
    originalIndex,
    timing: {
      schedule: {
        startOffsetMs: endOffsetMs - 3_600_000,
        endOffsetMs,
      },
      startTimeMs: 0,
      endTimeMs: endOffsetMs,
      lifecycle,
      remainingMs: lifecycle === "closed" ? 0 : endOffsetMs,
      outcome,
    },
  };
}

describe("inventory price range", () => {
  it("reads optional non-negative safe whole-dollar bounds", () => {
    expect(
      readInventoryPriceRange(
        new URLSearchParams("minPrice=12000&maxPrice=20000"),
      ),
    ).toEqual({ minimum: 12_000, maximum: 20_000 });
    expect(
      readInventoryPriceRange(new URLSearchParams("minPrice=0")),
    ).toEqual({ minimum: 0, maximum: null });
  });

  const invalidPriceBounds = [
    "-1",
    "1.5",
    "1e4",
    "01",
    "Infinity",
    "9007199254740992",
    "not-a-price",
  ];

  for (const value of invalidPriceBounds) {
    it(`discards an invalid price bound ${value}`, () => {
      expect(
        readInventoryPriceRange(
          new URLSearchParams({ minPrice: value, maxPrice: "20000" }),
        ),
      ).toEqual({ minimum: null, maximum: 20_000 });
    });
  }

  it("treats one or two bounds as one active range", () => {
    expect(
      isInventoryPriceRangeActive({ minimum: null, maximum: null }),
    ).toBe(false);
    expect(
      isInventoryPriceRangeActive({ minimum: 12_000, maximum: null }),
    ).toBe(true);
    expect(
      isInventoryPriceRangeActive({ minimum: 12_000, maximum: 20_000 }),
    ).toBe(true);
  });

  it("derives a stable slider domain from public card prices", () => {
    const listings = [
      listing("A-0035", 12_000, 0),
      listing("A-0036", 20_000, 1),
    ];

    expect(
      getInventoryPriceDomain(listings),
    ).toEqual({ minimum: 12_000, maximum: 20_000 });
    expect(getInventoryPriceDomain([])).toEqual({ minimum: 0, maximum: 1 });
  });

  it("clamps deep-link bounds and removes no-op domain endpoints", () => {
    const domain = { minimum: 2_500, maximum: 77_000 };

    expect(
      normalizeInventoryPriceRange(
        { minimum: 0, maximum: 250_000 },
        domain,
      ),
    ).toEqual({ minimum: null, maximum: null });
    expect(
      normalizeInventoryPriceRange(
        { minimum: 250_000, maximum: 10_000 },
        domain,
      ),
    ).toEqual({ minimum: 77_000, maximum: 10_000 });
  });

  it("reports a reversed range without silently swapping its bounds", () => {
    const priceRange = { minimum: 20_000, maximum: 12_000 };

    expect(getInventoryPriceRangeError(priceRange)).toBe(
      "Minimum price must be less than or equal to maximum price.",
    );
    expect(
      refineInventoryListings(
        [listing("A-0036", 12_000, 0)],
        priceRange,
        "default",
      ),
    ).toEqual([]);
  });

  it("includes vehicles exactly at either price boundary", () => {
    const listings = [
      listing("A-0035", 11_500, 0),
      listing("A-0036", 12_000, 1),
      listing("A-0037", 20_000, 2),
      listing("A-0038", 20_500, 3),
    ];

    expect(
      refineInventoryListings(
        listings,
        { minimum: 12_000, maximum: 20_000 },
        "default",
      ).map(({ vehicle }) => vehicle.lot),
    ).toEqual(["A-0036", "A-0037"]);
  });

  it("applies minimum-only and maximum-only bounds independently", () => {
    const listings = [
      listing("A-0035", 10_000, 0),
      listing("A-0036", 15_000, 1),
      listing("A-0037", 20_000, 2),
    ];

    expect(
      refineInventoryListings(
        listings,
        { minimum: 15_000, maximum: null },
        "default",
      ).map(({ vehicle }) => vehicle.lot),
    ).toEqual(["A-0036", "A-0037"]);
    expect(
      refineInventoryListings(
        listings,
        { minimum: null, maximum: 15_000 },
        "default",
      ).map(({ vehicle }) => vehicle.lot),
    ).toEqual(["A-0035", "A-0036"]);
  });
});

describe("inventory sorting", () => {
  const noRange = { minimum: null, maximum: null };

  it("reads only the supported URL values", () => {
    expect(readInventorySort(new URLSearchParams())).toBe("default");
    expect(readInventorySort(new URLSearchParams("sort=price-asc"))).toBe(
      "price-asc",
    );
    expect(readInventorySort(new URLSearchParams("sort=price-desc"))).toBe(
      "price-desc",
    );
    expect(readInventorySort(new URLSearchParams("sort=ending-soon"))).toBe(
      "ending-soon",
    );
    expect(readInventorySort(new URLSearchParams("sort=unsupported"))).toBe(
      "default",
    );
  });

  it("sorts prices in either direction with stable source-order ties", () => {
    const listings = [
      listing("A-0035", 20_000, 0),
      listing("A-0036", 10_000, 1),
      listing("A-0037", 10_000, 2),
    ];

    expect(
      refineInventoryListings(listings, noRange, "price-asc").map(
        ({ vehicle }) => vehicle.lot,
      ),
    ).toEqual(["A-0036", "A-0037", "A-0035"]);
    expect(
      refineInventoryListings(listings, noRange, "price-desc").map(
        ({ vehicle }) => vehicle.lot,
      ),
    ).toEqual(["A-0035", "A-0036", "A-0037"]);
    expect(listings.map(({ vehicle }) => vehicle.lot)).toEqual([
      "A-0035",
      "A-0036",
      "A-0037",
    ]);
  });

  it("puts open auctions first by deadline and closed purchases last", () => {
    const listings = [
      listing("A-0035", 20_000, 0, "closed", 60_000),
      listing("A-0036", 10_000, 1, "open", 120_000),
      listing("A-0037", 10_000, 2, "open", 60_000),
      listing("A-0038", 10_000, 3, "upcoming", 30_000),
    ];

    expect(
      refineInventoryListings(listings, noRange, "ending-soon").map(
        ({ vehicle }) => vehicle.lot,
      ),
    ).toEqual(["A-0037", "A-0036", "A-0038", "A-0035"]);
  });
});
