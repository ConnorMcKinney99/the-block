import type { AuctionOverlay } from "../domain/auction/types";

export type AuctionOverlayState = Readonly<Record<string, AuctionOverlay>>;

export interface AuctionOverlayUpdatedAction {
  readonly type: "auction-overlay-updated";
  readonly vehicleId: string;
  readonly overlay: AuctionOverlay;
}

export interface AuctionOverlaysResetAction {
  readonly type: "auction-overlays-reset";
}

export type AuctionAction =
  | AuctionOverlayUpdatedAction
  | AuctionOverlaysResetAction;

export function auctionReducer(
  state: AuctionOverlayState,
  action: AuctionAction,
): AuctionOverlayState {
  switch (action.type) {
    case "auction-overlay-updated":
      return {
        ...state,
        [action.vehicleId]: action.overlay,
      };
    case "auction-overlays-reset":
      return {};
  }
}
