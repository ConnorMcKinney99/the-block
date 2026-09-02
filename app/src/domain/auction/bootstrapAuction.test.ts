import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import { bootstrapAuction } from "./bootstrapAuction";
import {
  deriveReserveStatus,
  getAuctionDisplay,
  getAuctionDisplayForLifecycle,
  getReserveStatusLabel,
  hasDeferredBuyerActivity,
} from "./selectors";

describe("bootstrapAuction", () => {
  it("bootstraps a vehicle without a current bid", () => {
    expect(
      bootstrapAuction({
        startingBid: 10_000,
        reservePrice: 15_000,
        currentBid: null,
        bidCount: 0,
      }),
    ).toEqual({
      publicPrice: null,
      bidCount: 0,
      buyerMax: null,
      competitorMax: null,
      leader: null,
      finalization: null,
    });
  });

  it("treats an existing current bid as the competitor maximum", () => {
    expect(
      bootstrapAuction({
        startingBid: 8_500,
        reservePrice: 12_000,
        currentBid: 12_000,
        bidCount: 17,
      }),
    ).toEqual({
      publicPrice: 12_000,
      bidCount: 17,
      buyerMax: null,
      competitorMax: 12_000,
      leader: "competitor",
      finalization: null,
    });
  });
});

describe("auction selectors", () => {
  const reserveCases = [
    [null, null, "no-reserve", "No reserve"],
    [15_000, null, "not-met", "Reserve not met"],
    [15_000, 14_500, "not-met", "Reserve not met"],
    [15_000, 15_000, "met", "Reserve met"],
    [15_000, 15_500, "met", "Reserve met"],
  ] as const;

  for (const [reservePrice, publicPrice, expectedStatus, expectedLabel] of reserveCases) {
    it(`derives reserve ${reservePrice} at public price ${publicPrice} as ${expectedStatus}`, () => {
      const status = deriveReserveStatus(reservePrice, publicPrice);
      expect(status).toBe(expectedStatus);
      expect(getReserveStatusLabel(status)).toBe(expectedLabel);
    });
  }

  it("labels a no-bid auction with its starting bid", () => {
    const vehicle = {
      startingBid: 10_000,
      reservePrice: null,
      currentBid: null,
      bidCount: 0,
    };

    expect(getAuctionDisplay(vehicle, bootstrapAuction(vehicle))).toEqual({
      priceLabel: "Starting bid",
      publicPrice: 10_000,
      purchasePrice: null,
      bidCount: 0,
      reserveStatus: "no-reserve",
      isBuyerLeading: false,
      buyerMax: null,
    });
  });

  it("uses a Buy It Now finalization price to derive reserve status", () => {
    const vehicle = {
      startingBid: 9_000,
      reservePrice: 13_500,
      currentBid: null,
      bidCount: 0,
    };
    const overlay = {
      ...bootstrapAuction(vehicle),
      finalization: {
        type: "buy-now" as const,
        price: 17_000,
      },
    };

    expect(getAuctionDisplay(vehicle, overlay)).toMatchObject({
      publicPrice: 9_000,
      purchasePrice: 17_000,
      bidCount: 0,
      reserveStatus: "met",
    });
  });

  it("defers locally saved buyer activity while an auction is upcoming", () => {
    const vehicle = {
      startingBid: 10_000,
      reservePrice: 12_000,
      currentBid: null,
      bidCount: 0,
    };
    const overlay = {
      publicPrice: 10_000,
      bidCount: 1,
      buyerMax: 15_000,
      competitorMax: null,
      leader: "buyer" as const,
      finalization: null,
    };

    expect(hasDeferredBuyerActivity(overlay, "upcoming")).toBe(true);
    expect(
      getAuctionDisplayForLifecycle(vehicle, overlay, "upcoming"),
    ).toEqual({
      priceLabel: "Starting bid",
      publicPrice: 10_000,
      purchasePrice: null,
      bidCount: 0,
      reserveStatus: "not-met",
      isBuyerLeading: false,
      buyerMax: 15_000,
    });
    expect(getAuctionDisplayForLifecycle(vehicle, overlay, "open")).toMatchObject({
      priceLabel: "Current bid",
      bidCount: 1,
      isBuyerLeading: true,
      buyerMax: 15_000,
    });
  });
});
