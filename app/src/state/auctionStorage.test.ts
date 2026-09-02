import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import { findVehicleByLot, vehicles } from "../data/vehicles";
import { bootstrapAuction } from "../domain/auction/bootstrapAuction";
import { completeBuyNow } from "../domain/auction/buyNow";
import { submitMaximumBid } from "../domain/auction/proxyBid";
import type { AuctionOverlay } from "../domain/auction/types";
import type { Vehicle } from "../domain/vehicle/types";
import {
  AUCTION_STORAGE_KEY,
  AUCTION_STORAGE_VERSION,
  type AuctionStorage,
  loadAuctionOverlays,
  saveAuctionOverlays,
} from "./auctionStorage";

class MemoryAuctionStorage implements AuctionStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function vehicleForLot(lot: string): Vehicle {
  const vehicle = findVehicleByLot(lot);

  if (vehicle === undefined) {
    throw new Error(`Missing storage test fixture ${lot}.`);
  }

  return vehicle;
}

function buyerOverlay(vehicle: Vehicle, maximum: number): AuctionOverlay {
  const result = submitMaximumBid(
    vehicle,
    bootstrapAuction(vehicle),
    "buyer",
    maximum,
  );

  if (!result.ok) {
    throw new Error(`Unable to create persisted test overlay: ${result.code}.`);
  }

  return result.state;
}

function purchasedOverlay(
  vehicle: Vehicle,
  maximum: number | null = null,
): AuctionOverlay {
  const state =
    maximum === null
      ? bootstrapAuction(vehicle)
      : buyerOverlay(vehicle, maximum);
  const result = completeBuyNow(vehicle, state);

  if (!result.ok) {
    throw new Error(`Unable to create persisted purchase: ${result.code}.`);
  }

  return result.state;
}

describe("auction storage", () => {
  it("round-trips a sparse, versioned buyer overlay", () => {
    const storage = new MemoryAuctionStorage();
    const vehicle = vehicleForLot("A-0036");
    const overlay = buyerOverlay(vehicle, 13_500);

    expect(saveAuctionOverlays(storage, { [vehicle.id]: overlay })).toBe(true);

    expect(
      JSON.parse(storage.getItem(AUCTION_STORAGE_KEY) ?? "{}"),
    ).toEqual({
      version: AUCTION_STORAGE_VERSION,
      overlays: { [vehicle.id]: overlay },
    });
    expect(loadAuctionOverlays(storage, vehicles)).toEqual({
      [vehicle.id]: overlay,
    });
  });

  it("round-trips a Buy It Now finalization with prior buyer state", () => {
    const storage = new MemoryAuctionStorage();
    const vehicle = vehicleForLot("A-0036");
    const overlay = purchasedOverlay(vehicle, 13_500);

    expect(saveAuctionOverlays(storage, { [vehicle.id]: overlay })).toBe(true);
    expect(loadAuctionOverlays(storage, vehicles)).toEqual({
      [vehicle.id]: overlay,
    });
  });

  it("round-trips a Buy It Now finalization without a buyer maximum", () => {
    const storage = new MemoryAuctionStorage();
    const vehicle = vehicleForLot("A-0010");
    const overlay = purchasedOverlay(vehicle);

    expect(saveAuctionOverlays(storage, { [vehicle.id]: overlay })).toBe(true);
    expect(loadAuctionOverlays(storage, vehicles)).toEqual({
      [vehicle.id]: overlay,
    });
  });

  it("migrates a valid version 1 bid overlay with no finalization", () => {
    const storage = new MemoryAuctionStorage();
    const vehicle = vehicleForLot("A-0036");
    const currentOverlay = buyerOverlay(vehicle, 13_500);
    const legacyOverlay = {
      publicPrice: currentOverlay.publicPrice,
      bidCount: currentOverlay.bidCount,
      buyerMax: currentOverlay.buyerMax,
      competitorMax: currentOverlay.competitorMax,
      leader: currentOverlay.leader,
    };

    storage.setItem(
      AUCTION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        overlays: { [vehicle.id]: legacyOverlay },
      }),
    );

    expect(loadAuctionOverlays(storage, vehicles)).toEqual({
      [vehicle.id]: { ...legacyOverlay, finalization: null },
    });
  });

  it("removes storage when there are no locally changed overlays", () => {
    const storage = new MemoryAuctionStorage();
    storage.setItem(AUCTION_STORAGE_KEY, "stale");

    expect(saveAuctionOverlays(storage, {})).toBe(true);

    expect(storage.getItem(AUCTION_STORAGE_KEY)).toBeNull();
  });

  it("falls back safely for corrupt JSON and unsupported versions", () => {
    const storage = new MemoryAuctionStorage();
    storage.setItem(AUCTION_STORAGE_KEY, "{broken-json");
    expect(loadAuctionOverlays(storage, vehicles)).toEqual({});

    storage.setItem(
      AUCTION_STORAGE_KEY,
      JSON.stringify({ version: 999, overlays: {} }),
    );
    expect(loadAuctionOverlays(storage, vehicles)).toEqual({});
  });

  it("keeps valid entries while discarding malformed and unknown entries", () => {
    const storage = new MemoryAuctionStorage();
    const validVehicle = vehicleForLot("A-0036");
    const malformedVehicle = vehicleForLot("C-0040");
    const validOverlay = buyerOverlay(validVehicle, 13_500);

    storage.setItem(
      AUCTION_STORAGE_KEY,
      JSON.stringify({
        version: AUCTION_STORAGE_VERSION,
        overlays: {
          [validVehicle.id]: validOverlay,
          [malformedVehicle.id]: {
            ...buyerOverlay(malformedVehicle, 20_500),
            bidCount: "two",
          },
          "unknown-vehicle": validOverlay,
        },
      }),
    );

    expect(loadAuctionOverlays(storage, vehicles)).toEqual({
      [validVehicle.id]: validOverlay,
    });
  });

  const malformedFinalizations = [
    ["missing finalization", undefined],
    ["unknown finalization", { type: "other", price: 14_000 }],
    ["fractional price", { type: "buy-now", price: 14_000.5 }],
  ] as const;

  for (const [label, finalization] of malformedFinalizations) {
    it(`discards a version 2 entry with ${label}`, () => {
      const storage = new MemoryAuctionStorage();
      const vehicle = vehicleForLot("A-0036");
      const overlay = buyerOverlay(vehicle, 13_500);
      const storedOverlay = { ...overlay, finalization };

      storage.setItem(
        AUCTION_STORAGE_KEY,
        JSON.stringify({
          version: AUCTION_STORAGE_VERSION,
          overlays: { [vehicle.id]: storedOverlay },
        }),
      );

      expect(loadAuctionOverlays(storage, vehicles)).toEqual({});
    });
  }

  const impossibleOverlayCases = [
    ["price above maximum", { publicPrice: 14_000 }],
    ["count below baseline", { bidCount: 1 }],
    ["wrong leader", { leader: "competitor" }],
    ["tampered competitor maximum", { competitorMax: 12_500 }],
    [
      "tampered Buy It Now price",
      { finalization: { type: "buy-now", price: 14_500 } },
    ],
  ] as const;

  for (const [label, mutation] of impossibleOverlayCases) {
    it(`rejects an impossible overlay with ${label}`, () => {
      const storage = new MemoryAuctionStorage();
      const vehicle = vehicleForLot("A-0036");
      const baseline =
        "finalization" in mutation
          ? purchasedOverlay(vehicle, 13_500)
          : buyerOverlay(vehicle, 13_500);
      const overlay = {
        ...baseline,
        ...mutation,
      };

      storage.setItem(
        AUCTION_STORAGE_KEY,
        JSON.stringify({
          version: AUCTION_STORAGE_VERSION,
          overlays: { [vehicle.id]: overlay },
        }),
      );

      expect(loadAuctionOverlays(storage, vehicles)).toEqual({});
    });
  }

  it("continues safely when storage access throws", () => {
    const throwingStorage: AuctionStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };

    expect(loadAuctionOverlays(throwingStorage, vehicles)).toEqual({});
    expect(saveAuctionOverlays(throwingStorage, {})).toBe(false);
    expect(
      saveAuctionOverlays(throwingStorage, {
        [vehicleForLot("A-0036").id]: buyerOverlay(
          vehicleForLot("A-0036"),
          13_500,
        ),
      }),
    ).toBe(false);
  });
});
