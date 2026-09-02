import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import { findVehicleByLot, vehicles } from "../../data/vehicles";
import { bootstrapAuction } from "./bootstrapAuction";
import { completeBuyNow } from "./buyNow";
import { submitMaximumBid } from "./proxyBid";
import {
  DEMO_AUCTION_DURATION_MS,
  DEMO_MINUTE_MS,
  getAuctionLifecycle,
  getAuctionSchedule,
  getAuctionTiming,
  getSettledAuctionOutcome,
} from "./auctionLifecycle";

function vehicleForLot(lot: string) {
  const vehicle = findVehicleByLot(lot);

  if (vehicle === undefined) {
    throw new Error(`Missing lifecycle test fixture ${lot}.`);
  }

  return vehicle;
}

describe("demo auction lifecycle", () => {
  it("creates deterministic schedules with open and upcoming auctions", () => {
    const schedules = vehicles.map(getAuctionSchedule);
    const earlyClosings = schedules.filter(
      ({ endOffsetMs }) => endOffsetMs <= 10 * DEMO_MINUTE_MS,
    );
    const lifecycleCounts = schedules.reduce(
      (counts, schedule) => ({
        ...counts,
        [getAuctionLifecycle(schedule, 0)]:
          counts[getAuctionLifecycle(schedule, 0)] + 1,
      }),
      { upcoming: 0, open: 0, closed: 0 },
    );

    expect(earlyClosings).toHaveLength(40);
    expect(lifecycleCounts).toEqual({ upcoming: 90, open: 110, closed: 0 });
    expect(
      vehicles
        .filter(
          (vehicle) =>
            getAuctionLifecycle(getAuctionSchedule(vehicle), 0) === "upcoming",
        )
        .every((vehicle) => vehicle.currentBid === null),
    ).toBe(true);
    expect(
      schedules.every(
        ({ startOffsetMs, endOffsetMs }) =>
          endOffsetMs - startOffsetMs === DEMO_AUCTION_DURATION_MS,
      ),
    ).toBe(true);
  });

  const fixedDeadlineCases = [
    ["A-0036", 6],
    ["C-0040", 10],
  ] as const;

  for (const [lot, closingMinute] of fixedDeadlineCases) {
    it(`closes ${lot} at demo minute ${closingMinute}`, () => {
      const schedule = getAuctionSchedule(vehicleForLot(lot));

      expect(schedule.endOffsetMs).toBe(closingMinute * DEMO_MINUTE_MS);
      expect(schedule.startOffsetMs).toBe(
        (closingMinute - 60) * DEMO_MINUTE_MS,
      );
    });
  }

  it("delays a deterministic second wave until after demo time starts", () => {
    const schedule = getAuctionSchedule(vehicleForLot("A-0041"));

    expect(schedule).toEqual({
      startOffsetMs: DEMO_MINUTE_MS,
      endOffsetMs: 61 * DEMO_MINUTE_MS,
    });
    expect(getAuctionLifecycle(schedule, 0)).toBe("upcoming");
    expect(getAuctionLifecycle(schedule, DEMO_MINUTE_MS)).toBe("open");
  });

  it("is open immediately before the deadline and closed exactly at it", () => {
    const schedule = getAuctionSchedule(vehicleForLot("A-0036"));

    expect(getAuctionLifecycle(schedule, schedule.endOffsetMs - 1)).toBe("open");
    expect(getAuctionLifecycle(schedule, schedule.endOffsetMs)).toBe("closed");
  });

  it("derives buyer wins, competitor wins, no sales, and no-bid outcomes", () => {
    const reserveMet = vehicleForLot("A-0036");
    const buyerResult = submitMaximumBid(
      reserveMet,
      bootstrapAuction(reserveMet),
      "buyer",
      13_500,
    );

    expect(buyerResult.ok).toBe(true);
    if (!buyerResult.ok) {
      return;
    }
    expect(getSettledAuctionOutcome(reserveMet, buyerResult.state)).toBe(
      "buyer-won",
    );
    expect(
      getSettledAuctionOutcome(reserveMet, bootstrapAuction(reserveMet)),
    ).toBe("competitor-won");

    const reserveUnmet = vehicles.find(
      (vehicle) =>
        vehicle.currentBid !== null &&
        vehicle.reservePrice !== null &&
        vehicle.currentBid < vehicle.reservePrice,
    );
    const noBids = vehicles.find((vehicle) => vehicle.currentBid === null);

    expect(reserveUnmet).toBeDefined();
    expect(noBids).toBeDefined();
    expect(
      getSettledAuctionOutcome(
        reserveUnmet ?? reserveMet,
        bootstrapAuction(reserveUnmet ?? reserveMet),
      ),
    ).toBe("no-sale");
    expect(
      getSettledAuctionOutcome(
        noBids ?? reserveMet,
        bootstrapAuction(noBids ?? reserveMet),
      ),
    ).toBe("no-bids");
  });

  it("settles no-reserve and unmet-reserve edge cases from public state", () => {
    const noReserveNoBids = vehicleForLot("A-0011");
    const noReserveBuyer = submitMaximumBid(
      noReserveNoBids,
      bootstrapAuction(noReserveNoBids),
      "buyer",
      noReserveNoBids.startingBid,
    );

    expect(
      getSettledAuctionOutcome(
        noReserveNoBids,
        bootstrapAuction(noReserveNoBids),
      ),
    ).toBe("no-bids");
    expect(noReserveBuyer.ok).toBe(true);
    if (noReserveBuyer.ok) {
      expect(
        getSettledAuctionOutcome(noReserveNoBids, noReserveBuyer.state),
      ).toBe("buyer-won");
    }

    const unmetReserve = vehicleForLot("A-0006");
    const unmetBuyer = submitMaximumBid(
      unmetReserve,
      bootstrapAuction(unmetReserve),
      "buyer",
      unmetReserve.startingBid,
    );

    expect(unmetBuyer.ok).toBe(true);
    if (unmetBuyer.ok) {
      expect(getSettledAuctionOutcome(unmetReserve, unmetBuyer.state)).toBe(
        "no-sale",
      );
    }

    const noReserveCompetitor = vehicleForLot("A-0002");
    expect(
      getSettledAuctionOutcome(
        noReserveCompetitor,
        bootstrapAuction(noReserveCompetitor),
      ),
    ).toBe("competitor-won");
  });

  it("returns a closed timing result without persisting settlement state", () => {
    const vehicle = vehicleForLot("C-0040");
    const schedule = getAuctionSchedule(vehicle);
    const timing = getAuctionTiming(
      vehicle,
      bootstrapAuction(vehicle),
      schedule.endOffsetMs,
    );

    expect(timing).toMatchObject({
      lifecycle: "closed",
      remainingMs: 0,
      outcome: "competitor-won",
    });
  });

  it("anchors displayed start and end to the supplied system time", () => {
    const vehicle = vehicleForLot("A-0041");
    const elapsedMs = 30_000;
    const wallTimeMs = 1_800_000_000_000;
    const timing = getAuctionTiming(
      vehicle,
      bootstrapAuction(vehicle),
      elapsedMs,
      wallTimeMs,
    );

    expect(timing.startTimeMs).toBe(
      wallTimeMs - elapsedMs + DEMO_MINUTE_MS,
    );
    expect(timing.endTimeMs).toBe(
      wallTimeMs - elapsedMs + 61 * DEMO_MINUTE_MS,
    );
  });

  it("keeps display timestamps renderable for extreme clock input", () => {
    const vehicle = vehicleForLot("A-0041");
    const timing = getAuctionTiming(
      vehicle,
      bootstrapAuction(vehicle),
      Number.MAX_SAFE_INTEGER,
      1_000,
    );

    expect(() => new Date(timing.startTimeMs).toISOString()).not.toThrow();
    expect(() => new Date(timing.endTimeMs).toISOString()).not.toThrow();
    expect(timing).toMatchObject({
      startTimeMs: 0,
      endTimeMs: 0,
      lifecycle: "closed",
    });
  });

  it("closes immediately with a buyer purchase regardless of demo time", () => {
    const vehicle = vehicleForLot("A-0010");
    const purchase = completeBuyNow(vehicle, bootstrapAuction(vehicle));

    expect(purchase.ok).toBe(true);
    if (!purchase.ok) {
      return;
    }

    expect(getSettledAuctionOutcome(vehicle, purchase.state)).toBe(
      "buyer-purchased",
    );
    expect(getAuctionTiming(vehicle, purchase.state, 0)).toMatchObject({
      lifecycle: "closed",
      remainingMs: 0,
      outcome: "buyer-purchased",
    });
  });
});
