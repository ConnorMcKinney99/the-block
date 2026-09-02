import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import { bootstrapAuction } from "./bootstrapAuction";
import {
  getMinimumAcceptedMaximum,
  PROXY_BID_INCREMENT,
  submitMaximumBid,
} from "./proxyBid";
import { deriveReserveStatus } from "./selectors";
import type {
  AuctionOverlay,
  AuctionVehicleTerms,
  MaximumBidTransitionAccepted,
  MaximumBidTransitionResult,
} from "./types";

function terms(
  overrides: Partial<AuctionVehicleTerms> = {},
): AuctionVehicleTerms {
  return {
    startingBid: 10_000,
    reservePrice: null,
    currentBid: null,
    bidCount: 0,
    ...overrides,
  };
}

function accepted(
  result: MaximumBidTransitionResult,
): MaximumBidTransitionAccepted {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected an accepted maximum, received ${result.code}.`);
  }

  return result;
}

describe("proxy maximum validation", () => {
  it("rejects a first maximum below the starting bid without changing state", () => {
    const vehicle = terms();
    const state = bootstrapAuction(vehicle);
    const result = submitMaximumBid(vehicle, state, "buyer", 9_999);

    expect(result).toMatchObject({
      ok: false,
      code: "below-minimum",
      minimumAccepted: 10_000,
    });
    expect(result.state).toBe(state);
  });

  it("rejects a challenger below the public price plus one increment", () => {
    const vehicle = terms({ currentBid: 12_000, bidCount: 4 });
    const state = bootstrapAuction(vehicle);
    const result = submitMaximumBid(vehicle, state, "buyer", 12_499);

    expect(PROXY_BID_INCREMENT).toBe(500);
    expect(getMinimumAcceptedMaximum(vehicle, state, "buyer")).toBe(12_500);
    expect(result).toMatchObject({
      ok: false,
      code: "below-minimum",
      minimumAccepted: 12_500,
    });
    expect(result.state).toBe(state);
  });

  it("requires a participant to exceed their previous maximum", () => {
    const vehicle = terms();
    const buyerLeads = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 20_000),
    ).state;
    const competitorLoses = accepted(
      submitMaximumBid(vehicle, buyerLeads, "competitor", 15_000),
    ).state;
    const result = submitMaximumBid(
      vehicle,
      competitorLoses,
      "competitor",
      15_000,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "maximum-not-raised",
      minimumAccepted: 16_000,
    });
    expect(result.state).toBe(competitorLoses);
  });

  const invalidMaximums = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    0,
    -1,
    10_000.5,
    Number.MAX_SAFE_INTEGER + 1,
  ];

  for (const amount of invalidMaximums) {
    it(`rejects invalid numeric maximum ${String(amount)}`, () => {
      const vehicle = terms();
      const state = bootstrapAuction(vehicle);
      const result = submitMaximumBid(vehicle, state, "buyer", amount);

      expect(result).toMatchObject({ ok: false, code: "invalid-amount" });
      expect(result.state).toBe(state);
    });
  }

  it("reports when no larger safe whole-dollar maximum exists", () => {
    const vehicle = terms();
    const atSafeLimit = accepted(
      submitMaximumBid(
        vehicle,
        bootstrapAuction(vehicle),
        "buyer",
        Number.MAX_SAFE_INTEGER,
      ),
    ).state;
    const result = submitMaximumBid(
      vehicle,
      atSafeLimit,
      "buyer",
      Number.MAX_SAFE_INTEGER,
    );

    expect(getMinimumAcceptedMaximum(vehicle, atSafeLimit, "buyer")).toBeNull();
    expect(result).toMatchObject({
      ok: false,
      code: "maximum-limit-reached",
      minimumAccepted: null,
    });
    expect(result.state).toBe(atSafeLimit);
  });
});

describe("proxy-price transitions", () => {
  it("accepts a first maximum at the starting bid", () => {
    const vehicle = terms({ bidCount: 3 });
    const result = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 10_000),
    );

    expect(result.bidCountIncremented).toBe(true);
    expect(result.state).toEqual({
      publicPrice: 10_000,
      bidCount: 4,
      buyerMax: 10_000,
      competitorMax: null,
      leader: "buyer",
      finalization: null,
    });
  });

  it("keeps a high buyer maximum private while advancing only enough to lead", () => {
    const vehicle = terms({
      startingBid: 8_500,
      reservePrice: 12_000,
      currentBid: 12_000,
      bidCount: 17,
    });
    const result = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 13_500),
    );

    expect(result.state).toEqual({
      publicPrice: 12_500,
      bidCount: 18,
      buyerMax: 13_500,
      competitorMax: 12_000,
      leader: "buyer",
      finalization: null,
    });
    expect(deriveReserveStatus(vehicle.reservePrice, result.state.publicPrice)).toBe(
      "met",
    );
  });

  it("allows non-increment maximums without exposing them as public price", () => {
    const vehicle = terms({ currentBid: 12_000 });
    const result = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 13_501),
    );

    expect(result.state.publicPrice).toBe(12_500);
    expect(result.state.buyerMax).toBe(13_501);
  });

  it("raises the current leader maximum without changing price or count", () => {
    const vehicle = terms({ currentBid: 12_000, bidCount: 7 });
    const buyerLeads = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 13_500),
    ).state;
    const result = accepted(
      submitMaximumBid(vehicle, buyerLeads, "buyer", 14_001),
    );

    expect(result.bidCountIncremented).toBe(false);
    expect(result.state.publicPrice).toBe(12_500);
    expect(result.state.bidCount).toBe(8);
    expect(result.state.buyerMax).toBe(14_001);
  });

  it("raises a current leader across reserve without adding a bid event", () => {
    const vehicle = terms({ reservePrice: 15_000, bidCount: 2 });
    const belowReserve = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 14_000),
    ).state;
    const result = accepted(
      submitMaximumBid(vehicle, belowReserve, "buyer", 16_000),
    );

    expect(belowReserve.publicPrice).toBe(10_000);
    expect(result.bidCountIncremented).toBe(false);
    expect(result.state.publicPrice).toBe(15_000);
    expect(result.state.bidCount).toBe(3);
    expect(deriveReserveStatus(vehicle.reservePrice, result.state.publicPrice)).toBe(
      "met",
    );
  });

  it("advances the buyer proxy when a lower competitor challenges", () => {
    const vehicle = terms();
    const buyerLeads = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 20_000),
    ).state;
    const result = accepted(
      submitMaximumBid(vehicle, buyerLeads, "competitor", 15_000),
    );

    expect(result.bidCountIncremented).toBe(true);
    expect(result.state).toEqual({
      publicPrice: 15_500,
      bidCount: 2,
      buyerMax: 20_000,
      competitorMax: 15_000,
      leader: "buyer",
      finalization: null,
    });
  });

  it("preserves the incumbent leader when maximums are equal", () => {
    const vehicle = terms();
    const buyerLeads = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 20_000),
    ).state;
    const result = accepted(
      submitMaximumBid(vehicle, buyerLeads, "competitor", 20_000),
    );

    expect(result.state.leader).toBe("buyer");
    expect(result.state.publicPrice).toBe(20_000);
    expect(result.state.bidCount).toBe(2);
  });

  it("lets a higher competitor maximum take the lead", () => {
    const vehicle = terms();
    const buyerLeads = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 20_000),
    ).state;
    const result = accepted(
      submitMaximumBid(vehicle, buyerLeads, "competitor", 21_000),
    );

    expect(result.state.leader).toBe("competitor");
    expect(result.state.publicPrice).toBe(20_500);
    expect(result.state.bidCount).toBe(2);
  });

  it("caps the public price when a challenger cannot cover a full increment", () => {
    const vehicle = terms();
    const buyerLeads = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 15_000),
    ).state;
    const result = accepted(
      submitMaximumBid(vehicle, buyerLeads, "competitor", 15_250),
    );

    expect(result.state.leader).toBe("competitor");
    expect(result.state.publicPrice).toBe(15_250);
    expect(result.state.publicPrice).toBeLessThanOrEqual(
      result.state.competitorMax ?? 0,
    );
  });

  it("keeps reserve-met auctions bidable", () => {
    const vehicle = terms({
      startingBid: 14_500,
      reservePrice: 19_500,
      currentBid: 20_000,
      bidCount: 1,
    });
    const result = accepted(
      submitMaximumBid(vehicle, bootstrapAuction(vehicle), "buyer", 20_500),
    );

    expect(result.state.publicPrice).toBe(20_500);
    expect(result.state.bidCount).toBe(2);
    expect(deriveReserveStatus(vehicle.reservePrice, result.state.publicPrice)).toBe(
      "met",
    );
  });

  const reserveCases = [
    [null, 16_000, 10_000, "no-reserve"],
    [15_000, 14_000, 10_000, "not-met"],
    [15_000, 15_000, 15_000, "met"],
    [15_000, 16_000, 15_000, "met"],
  ] as const;

  for (const [reservePrice, maximum, expectedPrice, expectedStatus] of reserveCases) {
    it(`derives reserve ${reservePrice} after a first maximum ${maximum}`, () => {
      const vehicle = terms({ reservePrice });
      const result = accepted(
        submitMaximumBid(
          vehicle,
          bootstrapAuction(vehicle),
          "buyer",
          maximum,
        ),
      );

      expect(result.state.publicPrice).toBe(expectedPrice);
      expect(deriveReserveStatus(reservePrice, result.state.publicPrice)).toBe(
        expectedStatus,
      );
    });
  }

  it("counts accepted challenges once and never counts proxy responses separately", () => {
    const vehicle = terms({ bidCount: 10 });
    const initial = bootstrapAuction(vehicle);
    const first = accepted(
      submitMaximumBid(vehicle, initial, "buyer", 20_000),
    ).state;
    const challenge = accepted(
      submitMaximumBid(vehicle, first, "competitor", 15_000),
    ).state;
    const leaderRaise = accepted(
      submitMaximumBid(vehicle, challenge, "buyer", 21_000),
    ).state;
    const rejected = submitMaximumBid(
      vehicle,
      leaderRaise,
      "competitor",
      15_000,
    );

    expect(first.bidCount).toBe(11);
    expect(challenge.bidCount).toBe(12);
    expect(leaderRaise.bidCount).toBe(12);
    expect(rejected.state).toBe(leaderRaise);
    expect(rejected.state.bidCount).toBe(12);
  });

  it("never decreases public price or exceeds the leading maximum", () => {
    const vehicle = terms();
    const partialWin: AuctionOverlay = {
      publicPrice: 15_250,
      bidCount: 2,
      buyerMax: 15_000,
      competitorMax: 15_250,
      leader: "competitor",
      finalization: null,
    };
    const result = accepted(
      submitMaximumBid(vehicle, partialWin, "competitor", 15_400),
    );

    expect(result.state.publicPrice).toBe(15_400);
    expect(result.state.publicPrice).toBeGreaterThanOrEqual(
      partialWin.publicPrice ?? 0,
    );
    expect(result.state.publicPrice).toBeLessThanOrEqual(
      result.state.competitorMax ?? 0,
    );
    expect(result.state.bidCount).toBe(2);
  });
});
