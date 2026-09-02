import type {
  AuctionOverlay,
  BuyNowTransitionResult,
  BuyNowVehicleTerms,
} from "./types";

function isValidBuyNowPrice(price: number | null): price is number {
  return Number.isSafeInteger(price) && Number(price) > 0;
}

export function isBuyNowAvailable(
  vehicle: BuyNowVehicleTerms,
  state: AuctionOverlay,
): boolean {
  return (
    state.finalization === null &&
    isValidBuyNowPrice(vehicle.buyNowPrice) &&
    (state.publicPrice === null || state.publicPrice <= vehicle.buyNowPrice)
  );
}

export function completeBuyNow(
  vehicle: BuyNowVehicleTerms,
  state: AuctionOverlay,
): BuyNowTransitionResult {
  if (state.finalization !== null) {
    return {
      ok: false,
      code: "auction-closed",
      state,
    };
  }

  if (!isBuyNowAvailable(vehicle, state)) {
    return {
      ok: false,
      code: "buy-now-unavailable",
      state,
    };
  }

  const price = vehicle.buyNowPrice;

  if (price === null) {
    return {
      ok: false,
      code: "buy-now-unavailable",
      state,
    };
  }

  return {
    ok: true,
    price,
    state: {
      ...state,
      finalization: {
        type: "buy-now",
        price,
      },
    },
  };
}
