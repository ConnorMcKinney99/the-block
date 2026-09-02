import type {
  AuctionOverlay,
  AuctionVehicleTerms,
} from "./types";

export function bootstrapAuction(
  vehicle: AuctionVehicleTerms,
): AuctionOverlay {
  if (vehicle.currentBid === null) {
    return {
      publicPrice: null,
      bidCount: vehicle.bidCount,
      buyerMax: null,
      competitorMax: null,
      leader: null,
      finalization: null,
    };
  }

  return {
    publicPrice: vehicle.currentBid,
    bidCount: vehicle.bidCount,
    buyerMax: null,
    competitorMax: vehicle.currentBid,
    leader: "competitor",
    finalization: null,
  };
}
