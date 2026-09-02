import { bootstrapAuction } from "../domain/auction/bootstrapAuction";
import { completeBuyNow } from "../domain/auction/buyNow";
import { submitMaximumBid } from "../domain/auction/proxyBid";
import type {
  AuctionOverlay,
  BuyNowFinalization,
} from "../domain/auction/types";
import type { Vehicle } from "../domain/vehicle/types";
import type { AuctionOverlayState } from "./auctionReducer";
import type { KeyValueStorage } from "./storage";

export const AUCTION_STORAGE_KEY = "the-block:auction-overlays";
export const AUCTION_STORAGE_VERSION = 2;
const LEGACY_AUCTION_STORAGE_VERSION = 1;

export type AuctionStorage = KeyValueStorage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullablePositiveSafeInteger(value: unknown): value is number | null {
  return value === null || (Number.isSafeInteger(value) && Number(value) > 0);
}

function parseFinalization(value: unknown): BuyNowFinalization | null | false {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    value.type !== "buy-now" ||
    !Number.isSafeInteger(value.price) ||
    Number(value.price) <= 0
  ) {
    return false;
  }

  return {
    type: "buy-now",
    price: Number(value.price),
  };
}

function parseOverlay(
  value: unknown,
  version: typeof AUCTION_STORAGE_VERSION | typeof LEGACY_AUCTION_STORAGE_VERSION,
): AuctionOverlay | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    publicPrice,
    bidCount,
    buyerMax,
    competitorMax,
    leader,
    finalization: storedFinalization,
  } = value;
  const finalization =
    version === LEGACY_AUCTION_STORAGE_VERSION
      ? storedFinalization === undefined
        ? null
        : false
      : parseFinalization(storedFinalization);

  if (
    !isNullablePositiveSafeInteger(publicPrice) ||
    !Number.isSafeInteger(bidCount) ||
    Number(bidCount) < 0 ||
    !isNullablePositiveSafeInteger(buyerMax) ||
    !isNullablePositiveSafeInteger(competitorMax) ||
    (leader !== "buyer" && leader !== "competitor" && leader !== null) ||
    finalization === false
  ) {
    return null;
  }

  return {
    publicPrice,
    bidCount: Number(bidCount),
    buyerMax,
    competitorMax,
    leader,
    finalization,
  };
}

function overlaysMatch(left: AuctionOverlay, right: AuctionOverlay): boolean {
  return (
    left.publicPrice === right.publicPrice &&
    left.bidCount === right.bidCount &&
    left.buyerMax === right.buyerMax &&
    left.competitorMax === right.competitorMax &&
    left.leader === right.leader &&
    left.finalization?.type === right.finalization?.type &&
    left.finalization?.price === right.finalization?.price
  );
}

function isValidStoredOverlay(
  vehicle: Vehicle,
  overlay: AuctionOverlay,
): boolean {
  if (overlay.buyerMax === null && overlay.finalization === null) {
    return false;
  }

  let replayedOverlay = bootstrapAuction(vehicle);

  if (overlay.buyerMax !== null) {
    const replayedBid = submitMaximumBid(
      vehicle,
      replayedOverlay,
      "buyer",
      overlay.buyerMax,
    );

    if (!replayedBid.ok) {
      return false;
    }

    replayedOverlay = replayedBid.state;
  }

  if (overlay.finalization !== null) {
    const replayedPurchase = completeBuyNow(vehicle, replayedOverlay);

    if (!replayedPurchase.ok) {
      return false;
    }

    replayedOverlay = replayedPurchase.state;
  }

  return overlaysMatch(replayedOverlay, overlay);
}

export function loadAuctionOverlays(
  storage: AuctionStorage,
  inventory: readonly Vehicle[],
): AuctionOverlayState {
  let storedValue: string | null;

  try {
    storedValue = storage.getItem(AUCTION_STORAGE_KEY);
  } catch {
    return {};
  }

  if (storedValue === null) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(storedValue) as unknown;
  } catch {
    return {};
  }

  if (
    !isRecord(parsed) ||
    (parsed.version !== AUCTION_STORAGE_VERSION &&
      parsed.version !== LEGACY_AUCTION_STORAGE_VERSION) ||
    !isRecord(parsed.overlays)
  ) {
    return {};
  }

  const version = parsed.version;

  const vehiclesById = new Map(inventory.map((vehicle) => [vehicle.id, vehicle]));
  const validOverlays: Record<string, AuctionOverlay> = {};

  Object.entries(parsed.overlays).forEach(([vehicleId, storedOverlay]) => {
    const vehicle = vehiclesById.get(vehicleId);
    const overlay = parseOverlay(storedOverlay, version);

    if (
      vehicle !== undefined &&
      overlay !== null &&
      isValidStoredOverlay(vehicle, overlay)
    ) {
      validOverlays[vehicleId] = overlay;
    }
  });

  return validOverlays;
}

export function saveAuctionOverlays(
  storage: AuctionStorage,
  overlays: AuctionOverlayState,
): boolean {
  try {
    if (Object.keys(overlays).length === 0) {
      storage.removeItem(AUCTION_STORAGE_KEY);
      return true;
    }

    storage.setItem(
      AUCTION_STORAGE_KEY,
      JSON.stringify({
        version: AUCTION_STORAGE_VERSION,
        overlays,
      }),
    );
    return true;
  } catch {
    // Device-local persistence is best effort; bidding remains usable in memory.
    return false;
  }
}
