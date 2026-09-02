import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import { bootstrapAuction } from "./bootstrapAuction";
import { completeBuyNow, isBuyNowAvailable } from "./buyNow";
import { submitMaximumBid } from "./proxyBid";

const baseVehicle = {
  startingBid: 8_500,
  reservePrice: 12_000,
  currentBid: 12_000,
  bidCount: 17,
  buyNowPrice: 14_000,
};

describe("Buy It Now transition", () => {
  it("records the supplied fixed price without changing bid state", () => {
    const state = bootstrapAuction(baseVehicle);
    const result = completeBuyNow(baseVehicle, state);

    expect(result).toEqual({
      ok: true,
      price: 14_000,
      state: {
        ...state,
        finalization: {
          type: "buy-now",
          price: 14_000,
        },
      },
    });
    expect(result.state).toMatchObject({
      publicPrice: 12_000,
      bidCount: 17,
      buyerMax: null,
      competitorMax: 12_000,
      leader: "competitor",
    });
  });

  it("preserves an existing buyer maximum and public proxy price", () => {
    const bid = submitMaximumBid(
      baseVehicle,
      bootstrapAuction(baseVehicle),
      "buyer",
      13_500,
    );

    expect(bid.ok).toBe(true);
    if (!bid.ok) {
      return;
    }

    const purchase = completeBuyNow(baseVehicle, bid.state);

    expect(purchase.ok).toBe(true);
    expect(purchase.state).toMatchObject({
      publicPrice: 12_500,
      bidCount: 18,
      buyerMax: 13_500,
      competitorMax: 12_000,
      leader: "buyer",
      finalization: { type: "buy-now", price: 14_000 },
    });
  });

  it("never converts a maximum into an automatic purchase", () => {
    const bid = submitMaximumBid(
      baseVehicle,
      bootstrapAuction(baseVehicle),
      "buyer",
      20_000,
    );

    expect(bid.ok).toBe(true);
    if (bid.ok) {
      expect(bid.state.finalization).toBeNull();
      expect(isBuyNowAvailable(baseVehicle, bid.state)).toBe(true);
    }
  });

  it("keeps an offer available when the public bid equals its fixed price", () => {
    const vehicle = {
      ...baseVehicle,
      currentBid: baseVehicle.buyNowPrice,
    };
    const state = bootstrapAuction(vehicle);

    expect(isBuyNowAvailable(vehicle, state)).toBe(true);
    expect(completeBuyNow(vehicle, state).ok).toBe(true);
  });

  const unavailableOfferCases = [
    ["no configured offer", { ...baseVehicle, buyNowPrice: null }],
    ["negative configured offer", { ...baseVehicle, buyNowPrice: -1 }],
    ["fractional configured offer", { ...baseVehicle, buyNowPrice: 14_000.5 }],
    [
      "unsafe configured offer",
      { ...baseVehicle, buyNowPrice: Number.MAX_SAFE_INTEGER + 1 },
    ],
    [
      "infinite configured offer",
      { ...baseVehicle, buyNowPrice: Number.POSITIVE_INFINITY },
    ],
    [
      "public price above the offer",
      { ...baseVehicle, currentBid: 14_500 },
    ],
  ] as const;

  for (const [label, vehicle] of unavailableOfferCases) {
    it(`rejects ${label} without changing state`, () => {
      const state = bootstrapAuction(vehicle);
      const result = completeBuyNow(vehicle, state);

      expect(result).toMatchObject({
        ok: false,
        code: "buy-now-unavailable",
      });
      expect(result.state).toBe(state);
      expect(isBuyNowAvailable(vehicle, state)).toBe(false);
    });
  }

  it("rejects a duplicate purchase and later maximums without mutation", () => {
    const first = completeBuyNow(
      baseVehicle,
      bootstrapAuction(baseVehicle),
    );

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const duplicate = completeBuyNow(baseVehicle, first.state);
    const bid = submitMaximumBid(baseVehicle, first.state, "buyer", 15_000);

    expect(duplicate).toMatchObject({ ok: false, code: "auction-closed" });
    expect(duplicate.state).toBe(first.state);
    expect(bid).toMatchObject({ ok: false, code: "auction-closed" });
    expect(bid.state).toBe(first.state);
  });
});
