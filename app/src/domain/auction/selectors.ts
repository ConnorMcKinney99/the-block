import type { AuctionLifecycle } from "./auctionLifecycle";
import { bootstrapAuction } from "./bootstrapAuction";
import type {
  AuctionDisplay,
  AuctionOverlay,
  AuctionVehicleTerms,
  ReserveStatus,
} from "./types";

export function deriveReserveStatus(
  reservePrice: number | null,
  publicPrice: number | null,
): ReserveStatus {
  if (reservePrice === null) {
    return "no-reserve";
  }

  return publicPrice !== null && publicPrice >= reservePrice
    ? "met"
    : "not-met";
}

export function getAuctionDisplay(
  vehicle: AuctionVehicleTerms,
  overlay: AuctionOverlay,
): AuctionDisplay {
  const purchasePrice = overlay.finalization?.price ?? null;

  return {
    priceLabel: overlay.publicPrice === null ? "Starting bid" : "Current bid",
    publicPrice: overlay.publicPrice ?? vehicle.startingBid,
    purchasePrice,
    bidCount: overlay.bidCount,
    reserveStatus: deriveReserveStatus(
      vehicle.reservePrice,
      purchasePrice ?? overlay.publicPrice,
    ),
    isBuyerLeading: overlay.leader === "buyer",
    buyerMax: overlay.buyerMax,
  };
}

export function hasDeferredBuyerActivity(
  overlay: AuctionOverlay,
  lifecycle: AuctionLifecycle,
): boolean {
  return lifecycle === "upcoming" && overlay.buyerMax !== null;
}

export function getAuctionDisplayForLifecycle(
  vehicle: AuctionVehicleTerms,
  overlay: AuctionOverlay,
  lifecycle: AuctionLifecycle,
): AuctionDisplay {
  if (!hasDeferredBuyerActivity(overlay, lifecycle)) {
    return getAuctionDisplay(vehicle, overlay);
  }

  return {
    ...getAuctionDisplay(vehicle, bootstrapAuction(vehicle)),
    buyerMax: overlay.buyerMax,
  };
}

export function getReserveStatusLabel(status: ReserveStatus): string {
  switch (status) {
    case "no-reserve":
      return "No reserve";
    case "not-met":
      return "Reserve not met";
    case "met":
      return "Reserve met";
  }
}
