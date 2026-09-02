export type AuctionLeader = "buyer" | "competitor" | null;
export type AuctionParticipant = Exclude<AuctionLeader, null>;

export interface BuyNowFinalization {
  readonly type: "buy-now";
  readonly price: number;
}

export interface AuctionOverlay {
  readonly publicPrice: number | null;
  readonly bidCount: number;
  readonly buyerMax: number | null;
  readonly competitorMax: number | null;
  readonly leader: AuctionLeader;
  readonly finalization: BuyNowFinalization | null;
}

export type ReserveStatus = "no-reserve" | "not-met" | "met";

export interface AuctionVehicleTerms {
  readonly startingBid: number;
  readonly reservePrice: number | null;
  readonly currentBid: number | null;
  readonly bidCount: number;
}

export interface AuctionDisplay {
  readonly priceLabel: "Starting bid" | "Current bid";
  readonly publicPrice: number;
  readonly purchasePrice: number | null;
  readonly bidCount: number;
  readonly reserveStatus: ReserveStatus;
  readonly isBuyerLeading: boolean;
  readonly buyerMax: number | null;
}

export type MaximumBidFailureCode =
  | "invalid-amount"
  | "below-minimum"
  | "maximum-not-raised"
  | "maximum-limit-reached"
  | "auction-closed";

export interface MaximumBidValidationAccepted {
  readonly ok: true;
  readonly minimumAccepted: number;
}

export interface MaximumBidValidationRejected {
  readonly ok: false;
  readonly code: MaximumBidFailureCode;
  readonly minimumAccepted: number | null;
}

export type MaximumBidValidationResult =
  | MaximumBidValidationAccepted
  | MaximumBidValidationRejected;

export interface MaximumBidTransitionAccepted {
  readonly ok: true;
  readonly state: AuctionOverlay;
  readonly minimumAccepted: number;
  readonly bidCountIncremented: boolean;
}

export interface MaximumBidTransitionRejected
  extends MaximumBidValidationRejected {
  readonly state: AuctionOverlay;
}

export type MaximumBidTransitionResult =
  | MaximumBidTransitionAccepted
  | MaximumBidTransitionRejected;

export interface BuyNowVehicleTerms {
  readonly buyNowPrice: number | null;
}

export type BuyNowFailureCode = "buy-now-unavailable" | "auction-closed";

export interface BuyNowTransitionAccepted {
  readonly ok: true;
  readonly price: number;
  readonly state: AuctionOverlay;
}

export interface BuyNowTransitionRejected {
  readonly ok: false;
  readonly code: BuyNowFailureCode;
  readonly state: AuctionOverlay;
}

export type BuyNowTransitionResult =
  | BuyNowTransitionAccepted
  | BuyNowTransitionRejected;
